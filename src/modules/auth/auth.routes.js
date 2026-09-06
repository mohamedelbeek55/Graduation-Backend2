import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  me,
  // Feature 1 — Email Verification
  sendVerificationOTP,
  verifyEmail,
  // Feature 2 — Forgot / Reset Password (OTP-based)
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  // Feature 3 — Google OAuth
  googleAuth
} from "./auth.controller.js";

const router = Router();

// ─── Per-route rate limiters ───────────────────────────────────────────────

/**
 * OTP resend: max 1 request per 60 seconds per IP.
 * Keeps this tight — the controller also enforces a per-user 60 s cooldown,
 * so this acts as the outer IP-level guard.
 */
const otpResendLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 3,                     // allow burst of 3 (e.g. page refresh) within the window
  message: { message: "Too many OTP requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Forgot-password: max 3 requests per hour per IP to prevent OTP spam.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  message: { message: "Too many password reset requests. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Login / register: moderate limit to slow brute-force attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Google auth: same moderate limit as login.
 */
const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many Google auth requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Public auth routes ───────────────────────────────────────────────────

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

router.post("/refresh", refresh);
router.post("/logout", logout);

// ─── Token rotation & session management (protected) ─────────────────────

router.post("/logout-all", requireAuth, logoutAll);
router.patch("/password", requireAuth, changePassword);
router.get("/me", requireAuth, me);

// ─── Feature 1: Email Verification (OTP) ─────────────────────────────────
// send-verification-otp requires the user to be logged in (they just registered)

router.post("/send-verification-otp", requireAuth, otpResendLimiter, sendVerificationOTP);
router.post("/verify-email", verifyEmail);

// ─── Feature 2: Forgot / Reset Password (OTP) ────────────────────────────

router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// ─── Feature 3: Google OAuth ──────────────────────────────────────────────

router.post("/google", googleAuthLimiter, googleAuth);

export default router;
