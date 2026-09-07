import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import { User } from "../users/user.model.js";
import { Lawyer } from "../lawyers/lawyer.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendVerificationOTPEmail, sendPasswordResetOTPEmail } from "../../utils/email.js";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/password.js";
import {
  generateOTP,
  hashOTP,
  verifyOTP,
  otpExpiresAt,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_LOCKOUT_MS
} from "../../utils/otp.js";

import {
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newJti,
  refreshExpiresAt,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshFromReq
} from "./auth.refresh.js";

// Google OAuth2 client — initialised lazily so the module loads even if
// GOOGLE_CLIENT_ID is not set (e.g. during unit tests of other routes).
let googleClient;
function getGoogleClient() {
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .refine(isStrongPassword, { message: PASSWORD_POLICY_MESSAGE })
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().optional()
});

const logoutSchema = z.object({
  refreshToken: z.string().optional()
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .refine(isStrongPassword, { message: PASSWORD_POLICY_MESSAGE })
});

const forgotSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6)
});

// ── New schemas ───────────────────────────────────────────────────────────────

const sendVerificationOTPSchema = z.object({
  email: z.string().email()
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});

const verifyResetOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(10),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .refine(isStrongPassword, { message: PASSWORD_POLICY_MESSAGE })
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1)
});

function signAccessToken({ sub, role }) {
  return jwt.sign({ sub, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m"
  });
}

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  // ✅ Check both collections for email existence
  const userExists = await User.findOne({ email: data.email });
  const lawyerExists = await Lawyer.findOne({ email: data.email });
  if (userExists || lawyerExists) {
    return res.status(409).json({ message: "Email already exists in our system" });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Generate email verification OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);

  const user = await User.create({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    role: "user",
    isActive: true,
    authProvider: "local",
    // Store hashed OTP for verification
    emailVerificationOTP: otpHash,
    emailVerificationOTPExpires: otpExpiresAt(),
    emailVerificationOTPSentAt: new Date()
  });

  // Send OTP email — awaited so Vercel doesn't kill the function before delivery
  try {
    await sendVerificationOTPEmail(data.email, otp, data.fullName);
  } catch (err) {
    console.error("⚠️  Failed to send verification email:", err.message);
    // Continue registration even if the email fails — user can resend later
  }

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  // ✅ issue refresh too (web cookie + mobile body)
  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    jti,
    expiresAt: refreshExpiresAt(),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });
  await user.save();

  setRefreshCookie(res, refreshToken);

  return res.status(201).json({
    user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    accessToken,
    refreshToken,
    // Remind the client to verify their email
    emailVerified: false,
    message: "Registration successful. A verification code has been sent to your email."
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  // 1. Try User
  let account = await User.findOne({ email: data.email });
  let isLawyer = false;

  // 2. Try Lawyer if not found in User
  if (!account) {
    account = await Lawyer.findOne({ email: data.email });
    if (account) isLawyer = true;
  }

  if (!account) return res.status(401).json({ message: "Invalid credentials" });

  // ✅ block disabled accounts
  if (account.isActive === false) {
    return res.status(403).json({ message: "Account disabled" });
  }

  // ✅ for lawyers, check verification (bypass for Admin-created lawyers now default to true)
  if (isLawyer && account.isVerified === false) {
    return res.status(403).json({ message: "Lawyer account not verified by admin yet" });
  }

  const ok = await bcrypt.compare(data.password, account.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: account._id.toString(), role: account.role });

  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: account._id.toString(), jti });

  if (!isLawyer) {
    // Standard User refresh token logic
    account.refreshTokens = account.refreshTokens || [];
    account.refreshTokens.push({
      tokenHash: hashToken(refreshToken),
      jti,
      expiresAt: refreshExpiresAt(),
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || ""
    });
    if (account.refreshTokens.length > 10) {
      account.refreshTokens = account.refreshTokens.slice(account.refreshTokens.length - 10);
    }
    await account.save();
  }

  setRefreshCookie(res, refreshToken);

  return res.json({
    user: { id: account._id, fullName: account.fullName, email: account.email, role: account.role },
    accessToken,
    refreshToken
  });
});

export const refresh = asyncHandler(async (req, res) => {
  refreshSchema.parse(req.body);
  const token = getRefreshFromReq(req);

  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ message: "Invalid refresh token" });

  // ✅ block disabled accounts (no new access tokens)
  if (user.isActive === false) {
    clearRefreshCookie(res);
    return res.status(403).json({ message: "Account disabled" });
  }

  const tokenHash = hashToken(token);

  const entry = (user.refreshTokens || []).find(
    (t) =>
      t.tokenHash === tokenHash &&
      !t.revokedAt &&
      new Date(t.expiresAt).getTime() > Date.now()
  );

  if (!entry) return res.status(401).json({ message: "Refresh token revoked or expired" });

  // ✅ rotation: revoke old token
  entry.revokedAt = new Date();

  // ✅ issue new tokens
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  const newRefreshJti = newJti();
  const newRefreshToken = signRefreshToken({ sub: user._id.toString(), jti: newRefreshJti });

  user.refreshTokens.push({
    tokenHash: hashToken(newRefreshToken),
    jti: newRefreshJti,
    expiresAt: refreshExpiresAt(),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });

  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(user.refreshTokens.length - 10);
  }

  await user.save();

  setRefreshCookie(res, newRefreshToken);

  return res.json({ accessToken, refreshToken: newRefreshToken });
});

export const logout = asyncHandler(async (req, res) => {
  logoutSchema.parse(req.body);
  const token = getRefreshFromReq(req);

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub);
      if (user) {
        const tokenHash = hashToken(token);
        const entry = (user.refreshTokens || []).find(
          (t) => t.tokenHash === tokenHash && !t.revokedAt
        );
        if (entry) {
          entry.revokedAt = new Date();
          await user.save();
        }
      }
    } catch {
      // ignore
    }
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
});

export const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: "Not found" });

  user.refreshTokens = [];
  await user.save();

  clearRefreshCookie(res);
  return res.json({ ok: true });
});

export const changePassword = asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: "Not found" });

  const ok = await bcrypt.compare(data.oldPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Wrong password" });

  user.passwordHash = await bcrypt.hash(data.newPassword, 10);

  // revoke all refresh tokens
  user.refreshTokens = [];
  await user.save();

  clearRefreshCookie(res);
  return res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — Forgot Password (OTP-based)
// Replaces the old token-based implementation that leaked the reset token.
// ─────────────────────────────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = forgotSchema.parse(req.body);

  // Always respond with the same generic message to prevent user enumeration
  const genericOk = () => res.json({ ok: true, message: "If that email is registered, a reset code has been sent." });

  const user = await User.findOne({ email: data.email });
  if (!user) return genericOk();

  // Google-only accounts have no password — no point sending a reset OTP
  if (user.authProvider === "google" && !user.passwordHash) return genericOk();

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);

  user.resetPasswordOTP = otpHash;
  user.resetPasswordOTPExpires = otpExpiresAt();
  await user.save();

  // Awaited so Vercel doesn't terminate the function before the email is delivered
  try {
    await sendPasswordResetOTPEmail(data.email, otp, user.fullName);
  } catch (err) {
    console.error("⚠️  Failed to send reset OTP email:", err.message);
    // Still return genericOk — we don't want to reveal whether the email exists
  }

  return genericOk();
});

export const verifyResetOTP = asyncHandler(async (req, res) => {
  const data = verifyResetOTPSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });

  // Generic invalid message — same whether user not found, OTP wrong, or expired
  const invalid = () => res.status(400).json({ message: "Invalid or expired reset code." });

  if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpires) return invalid();

  // Check expiry
  if (user.resetPasswordOTPExpires < new Date()) {
    // Clear expired OTP
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();
    return invalid();
  }

  const match = await verifyOTP(data.otp, user.resetPasswordOTP);
  if (!match) return invalid();

  // OTP is valid — issue a short-lived, purpose-scoped JWT reset token (10 min)
  const resetToken = jwt.sign(
    { sub: user._id.toString(), purpose: "password_reset" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "10m" }
  );

  // Clear the OTP now — it's single-use
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpires = null;
  await user.save();

  return res.json({ ok: true, resetToken });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);

  // Verify the purpose-scoped reset token
  let payload;
  try {
    payload = jwt.verify(data.resetToken, process.env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(400).json({ message: "Invalid or expired reset token." });
  }

  if (payload.purpose !== "password_reset") {
    return res.status(400).json({ message: "Invalid reset token." });
  }

  const user = await User.findById(payload.sub);
  if (!user) return res.status(400).json({ message: "Invalid or expired reset token." });

  // Prevent reusing the same password (skip for Google-only accounts with no password)
  if (user.passwordHash) {
    const isSame = await bcrypt.compare(data.newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different from your current password." });
    }
  }

  user.passwordHash = await bcrypt.hash(data.newPassword, 10);

  // Invalidate all active sessions (bump security by clearing all refresh tokens)
  user.refreshTokens = [];

  // Clear any legacy token-based reset fields too
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;

  await user.save();
  clearRefreshCookie(res);

  return res.json({ ok: true, message: "Password updated successfully." });
});

export const me = asyncHandler(async (req, res) => {
  // Try User first
  let account = await User.findById(req.user.sub).select(
    "fullName email role isActive isEmailVerified authProvider createdAt"
  );

  // If not found in User, try Lawyer (lawyer tokens also use /auth/login)
  if (!account) {
    account = await Lawyer.findById(req.user.sub).select(
      "fullName email role isActive isVerified createdAt"
    );
  }

  if (!account) return res.status(404).json({ message: "Account not found" });

  return res.json({ user: account });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — Email Verification (OTP-based)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-verification-otp
 * Sends (or resends) a 6-digit OTP to verify the user's email.
 * Rate-limited: max 1 request per 60 seconds per user.
 * Requires the user to be authenticated (they have an access token from register).
 */
export const sendVerificationOTP = asyncHandler(async (req, res) => {
  // Identity comes from the Bearer token (requireAuth), not the request body.
  // No body needed for this endpoint.

  // Use the authenticated user's ID from the token (set by requireAuth)
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: "Account not found" });

  // Already verified — nothing to do
  if (user.isEmailVerified) {
    return res.status(409).json({ message: "Email is already verified." });
  }

  // Rate-limit: enforce 60-second cool-down between sends
  if (user.emailVerificationOTPSentAt) {
    const elapsed = Date.now() - new Date(user.emailVerificationOTPSentAt).getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const waitSecs = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSecs} second(s) before requesting a new code.`
      });
    }
  }

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);

  // Invalidate any previous OTP and reset attempt counter
  user.emailVerificationOTP = otpHash;
  user.emailVerificationOTPExpires = otpExpiresAt();
  user.emailVerificationOTPSentAt = new Date();
  user.otpAttempts = 0;
  user.otpLockedUntil = null;
  await user.save();

  // Awaited so Vercel doesn't terminate the function before the email is delivered
  try {
    await sendVerificationOTPEmail(user.email, otp, user.fullName);
  } catch (err) {
    console.error("⚠️  Failed to send verification email:", err.message);
    // Still respond with ok — the user can retry; DB already has the new OTP
  }

  return res.json({ ok: true, message: "Verification code sent to your email." });
});

/**
 * POST /api/auth/verify-email
 * Verifies the email using the 6-digit OTP.
 * Body: { email, otp }
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const data = verifyEmailSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  if (!user) return res.status(400).json({ message: "Invalid request." });

  // Already verified
  if (user.isEmailVerified) {
    return res.status(409).json({ message: "Email is already verified." });
  }

  // Check if account is locked out due to too many failed attempts
  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    const waitMins = Math.ceil(
      (new Date(user.otpLockedUntil).getTime() - Date.now()) / 60_000
    );
    return res.status(429).json({
      message: `Too many failed attempts. Please try again in ${waitMins} minute(s).`
    });
  }

  // No OTP stored (never sent, or already cleared)
  if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires) {
    return res.status(400).json({ message: "No active verification code. Please request a new one." });
  }

  // Check OTP expiry
  if (user.emailVerificationOTPExpires < new Date()) {
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpires = null;
    await user.save();
    return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
  }

  // Verify the OTP
  const match = await verifyOTP(data.otp, user.emailVerificationOTP);
  if (!match) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      // Lock the account for 15 minutes
      user.otpLockedUntil = new Date(Date.now() + OTP_LOCKOUT_MS);
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({
        message: "Too many failed attempts. Your account is locked for 15 minutes."
      });
    }

    const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
    await user.save();
    return res.status(400).json({
      message: `Invalid verification code. ${remaining} attempt(s) remaining.`
    });
  }

  // ✅ Success — mark email as verified and clear OTP fields
  user.isEmailVerified = true;
  user.emailVerificationOTP = null;
  user.emailVerificationOTPExpires = null;
  user.emailVerificationOTPSentAt = null;
  user.otpAttempts = 0;
  user.otpLockedUntil = null;
  await user.save();

  return res.json({ ok: true, message: "Email verified successfully." });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3 — Google Sign-Up / Login (ID-token flow)
// The frontend handles the Google Sign-In button and sends us the ID token.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/google
 * Body: { idToken }  — the Google ID token from the frontend
 */
export const googleAuth = asyncHandler(async (req, res) => {
  const data = googleAuthSchema.parse(req.body);

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ message: "Google authentication is not configured on this server." });
  }

  // ── Verify the token with Google ─────────────────────────────────────────
  // Supports both ID tokens (JWT, 3 parts) and access tokens (opaque string).
  // The popup flow (oauth2.initTokenClient) produces an access token.
  // The One Tap / renderButton flow produces an ID token.
  let googlePayload;

  const token = data.idToken;
  const isJWT = token.split('.').length === 3;

  if (isJWT) {
    // ID token — verify with google-auth-library
    try {
      const ticket = await getGoogleClient().verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      googlePayload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Invalid Google token." });
    }
  } else {
    // Access token — exchange for user info via Google's userinfo endpoint
    try {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return res.status(401).json({ message: "Invalid Google access token." });
      const info = await resp.json();
      googlePayload = {
        sub: info.sub,
        email: info.email,
        name: info.name,
        email_verified: info.email_verified
      };
    } catch {
      return res.status(401).json({ message: "Could not verify Google token." });
    }
  }

  const { sub: googleId, email, name: fullName, email_verified } = googlePayload;

  // Google guarantees the email is verified, but guard anyway
  if (!email_verified) {
    return res.status(400).json({ message: "Google account email is not verified." });
  }

  // ── Find or create user ───────────────────────────────────────────────────

  let user = await User.findOne({ email });

  if (user) {
    if (user.authProvider === "local") {
      // Account exists with a local password — link the Google account
      // (account linking: attach googleId and mark provider as google-linked)
      user.googleId = googleId;
      // Keep authProvider as 'local' so the user can still log in with password,
      // but store googleId for future Google logins.
      await user.save();
    } else if (user.authProvider === "google") {
      // Returning Google user — ensure googleId is up to date
      if (user.googleId !== googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }
  } else {
    // New user — create with Google provider
    user = await User.create({
      fullName: fullName || email.split("@")[0],
      email,
      passwordHash: null,          // No password for Google-only accounts
      authProvider: "google",
      googleId,
      isEmailVerified: true,          // Google already verified the email
      isActive: true,
      role: "user"
    });
  }

  // ── Issue our own JWT tokens (same as normal login flow) ─────────────────

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    jti,
    expiresAt: refreshExpiresAt(),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || ""
  });

  // Keep the token list bounded to the last 10 sessions
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(user.refreshTokens.length - 10);
  }

  await user.save();
  setRefreshCookie(res, refreshToken);

  return res.json({
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      emailVerified: user.isEmailVerified
    },
    accessToken,
    refreshToken
  });
});