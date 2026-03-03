import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";
import crypto from "crypto";

import { User } from "../users/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

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

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
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
  newPassword: z.string().min(6)
});

const forgotSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6)
});

function signAccessToken({ sub, role }) {
  return jwt.sign({ sub, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m"
  });
}

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.findOne({ email: data.email });
  if (exists) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    role: "user",
    // ✅ ensure active by default (in case schema not updated yet)
    isActive: true
  });

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
    refreshToken
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // ✅ block disabled accounts
  if (user.isActive === false) {
    return res.status(403).json({ message: "Account disabled" });
  }

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

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

  // keep last 10 sessions
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(user.refreshTokens.length - 10);
  }

  await user.save();

  setRefreshCookie(res, refreshToken);

  return res.json({
    user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
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

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = forgotSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });

  // Security: always ok
  if (!user) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save();

  // ✅ For now return token (later send email)
  return res.json({ ok: true, resetToken: token });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = resetSchema.parse(req.body);

  const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.passwordHash = await bcrypt.hash(data.newPassword, 10);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;

  // revoke all refresh tokens
  user.refreshTokens = [];
  await user.save();

  clearRefreshCookie(res);
  return res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select(
    "fullName email role isActive createdAt"
  );
  return res.json({ user });
});