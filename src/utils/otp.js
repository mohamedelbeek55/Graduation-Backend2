/**
 * OTP utility — generation, hashing, and comparison helpers.
 *
 * We use bcrypt (same library already in the project) to hash OTPs before
 * storing them in the database, so a database breach does not expose codes.
 *
 * Usage:
 *   import { generateOTP, hashOTP, verifyOTP } from "../../utils/otp.js";
 *
 *   const plain  = generateOTP();          // "482031"
 *   const hashed = await hashOTP(plain);   // bcrypt hash
 *   const ok     = await verifyOTP(plain, hashed); // true | false
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";

// ─── Constants ─────────────────────────────────────────────────────────────

/** OTP expiry window in milliseconds (10 minutes). */
export const OTP_EXPIRES_MS = 10 * 60 * 1000;

/** Re-send cool-down in milliseconds (60 seconds). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Maximum failed verification attempts before lockout. */
export const OTP_MAX_ATTEMPTS = 5;

/** Lockout duration after max failed attempts (15 minutes). */
export const OTP_LOCKOUT_MS = 15 * 60 * 1000;

/** bcrypt cost factor — low enough to be fast for 6-digit codes. */
const BCRYPT_ROUNDS = 10;

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 6-digit numeric OTP string.
 * Uses crypto.randomInt to avoid modulo bias.
 *
 * @returns {string} Zero-padded 6-digit string, e.g. "042871"
 */
export function generateOTP() {
  // randomInt(0, 1_000_000) → 0–999999, then zero-pad to 6 chars
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Hashes a plain OTP with bcrypt for secure DB storage.
 *
 * @param {string} plainOTP - The 6-digit code to hash
 * @returns {Promise<string>} bcrypt hash
 */
export function hashOTP(plainOTP) {
  return bcrypt.hash(plainOTP, BCRYPT_ROUNDS);
}

/**
 * Compares a plain OTP candidate against a stored bcrypt hash.
 *
 * @param {string} plainOTP  - User-supplied code
 * @param {string} hashedOTP - Value stored in the database
 * @returns {Promise<boolean>}
 */
export function verifyOTP(plainOTP, hashedOTP) {
  return bcrypt.compare(plainOTP, hashedOTP);
}

/**
 * Returns the Date at which a freshly generated OTP expires.
 *
 * @returns {Date}
 */
export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRES_MS);
}
