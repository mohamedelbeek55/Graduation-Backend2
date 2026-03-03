import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "lawyer", "admin"], default: "user" },
    refreshTokens: [
  {
    tokenHash: { type: String, required: true },
    jti: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" }
  }
],

phone: { type: String, default: "" },
bio: { type: String, default: "" },
avatarUrl: { type: String, default: "" },
avatarPublicId: { type: String, default: "" },
isActive: { type: Boolean, default: true },

passwordResetTokenHash: { type: String, default: null },
passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);