import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // passwordHash is optional for Google-only accounts
    passwordHash: { type: String, default: null },

    role: { type: String, enum: ["user", "lawyer", "admin"], default: "user" },

    // ── Auth Provider ──────────────────────────────────────────────────────────
    // 'local' = email+password, 'google' = Google OAuth
    authProvider: { type: String, enum: ["local", "google"], default: "local" },

    // Google OAuth fields — sparse so multiple null values are allowed alongside unique
    googleId: { type: String, default: null, sparse: true },

    // ── Refresh Tokens ─────────────────────────────────────────────────────────
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        jti:       { type: String, required: true },
        createdAt: { type: Date,   default: Date.now },
        expiresAt: { type: Date,   required: true },
        revokedAt: { type: Date,   default: null },
        userAgent: { type: String, default: "" },
        ip:        { type: String, default: "" }
      }
    ],

    // ── Profile ────────────────────────────────────────────────────────────────
    phone:          { type: String, default: "" },
    bio:            { type: String, default: "" },
    avatarUrl:      { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    isActive:       { type: Boolean, default: true },

    // ── Email Verification (OTP) ───────────────────────────────────────────────
    isEmailVerified:            { type: Boolean, default: false },
    emailVerificationOTP:       { type: String, default: null },   // bcrypt hash of OTP
    emailVerificationOTPExpires:{ type: Date,   default: null },
    emailVerificationOTPSentAt: { type: Date,   default: null },   // rate-limit: last sent timestamp
    otpAttempts:                { type: Number, default: 0 },      // failed verify attempts
    otpLockedUntil:             { type: Date,   default: null },   // locked after 5 bad attempts

    // ── Password Reset (OTP) ──────────────────────────────────────────────────
    resetPasswordOTP:        { type: String, default: null },      // bcrypt hash of OTP
    resetPasswordOTPExpires: { type: Date,   default: null },

    // Legacy token-based reset (kept so existing reset links still work during transition)
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date,   default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);