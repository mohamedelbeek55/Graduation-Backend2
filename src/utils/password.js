/**
 * Password strength utility.
 *
 * Rules are intentionally kept identical to the frontend (signup.js PW_RULES)
 * so validation is consistent across the stack.
 *
 * Rules enforced:
 *   1. Minimum 8 characters
 *   2. At least one uppercase letter  (A-Z)
 *   3. At least one lowercase letter  (a-z)
 *   4. At least one digit             (0-9)
 *   5. At least one special character (anything that is not A-Za-z0-9)
 *
 * Usage (Zod refine):
 *   import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/password.js";
 *
 *   z.string().refine(isStrongPassword, { message: PASSWORD_POLICY_MESSAGE })
 */

/** Human-readable rejection message sent to the client. */
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and contain an uppercase letter, " +
  "a lowercase letter, a number, and a special character.";

/**
 * Returns true when every password rule is satisfied.
 *
 * @param {string} pw - Plain-text password to validate
 * @returns {boolean}
 */
export function isStrongPassword(pw) {
  if (typeof pw !== "string") return false;
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}
