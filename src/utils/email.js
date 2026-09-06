/**
 * Email utility — thin wrapper around Nodemailer.
 *
 * Configuration is driven entirely by environment variables:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 *
 * Usage:
 *   import { sendEmail } from "../../utils/email.js";
 *   await sendEmail({ to, subject, html });
 */

import nodemailer from "nodemailer";

/**
 * Returns a configured Nodemailer transporter.
 * The transporter is created fresh each call so env changes in tests are
 * picked up without module-level caching issues.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for port 465, false for others
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Sends a transactional email.
 *
 * @param {Object} opts
 * @param {string}  opts.to       - Recipient address
 * @param {string}  opts.subject  - Email subject line
 * @param {string}  opts.html     - HTML body (plain text via `text` is optional)
 * @param {string} [opts.text]    - Plain-text fallback (auto-generated from html if omitted)
 * @returns {Promise<void>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || `"LexaGuide" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    // Strip tags as a basic plain-text fallback if caller didn't supply one
    text: text ?? html.replace(/<[^>]*>/g, "").replace(/\s{2,}/g, " ").trim()
  });
}

// ─── Pre-built email templates ─────────────────────────────────────────────

/**
 * Sends the 6-digit email verification OTP to the user.
 *
 * @param {string} to       - Recipient address
 * @param {string} otp      - Plain-text 6-digit OTP
 * @param {string} fullName - User's display name
 */
export async function sendVerificationOTPEmail(to, otp, fullName) {
  await sendEmail({
    to,
    subject: "LexaGuide — Verify your email address",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#1a3c5e;">Email Verification</h2>
        <p>Hi <strong>${fullName}</strong>,</p>
        <p>Use the code below to verify your LexaGuide email address.
           It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    background:#f4f4f4;padding:16px 24px;border-radius:8px;
                    text-align:center;margin:24px 0;">${otp}</div>
        <p style="color:#888;font-size:12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `
  });
}

/**
 * Sends the 6-digit password-reset OTP to the user.
 *
 * @param {string} to       - Recipient address
 * @param {string} otp      - Plain-text 6-digit OTP
 * @param {string} fullName - User's display name
 */
export async function sendPasswordResetOTPEmail(to, otp, fullName) {
  await sendEmail({
    to,
    subject: "LexaGuide — Password reset code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#1a3c5e;">Password Reset</h2>
        <p>Hi <strong>${fullName}</strong>,</p>
        <p>Use the code below to reset your LexaGuide password.
           It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    background:#f4f4f4;padding:16px 24px;border-radius:8px;
                    text-align:center;margin:24px 0;">${otp}</div>
        <p style="color:#888;font-size:12px;">
          If you didn't request a password reset, please secure your account immediately.
        </p>
      </div>
    `
  });
}
