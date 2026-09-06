import jwt from "jsonwebtoken";
import { User } from "../modules/users/user.model.js";
import { Lawyer } from "../modules/lawyers/lawyer.model.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // ✅ Verify account is still active and exists in DB
    let account;
    if (payload.role === "lawyer") {
      account = await Lawyer.findById(payload.sub);
    } else {
      account = await User.findById(payload.sub);
    }

    if (!account || account.isActive === false) {
      return res.status(403).json({ message: "Account disabled or not found" });
    }

    req.user = payload; // { sub, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Optional authentication middleware.
 * Sets req.user if token is valid, otherwise proceeds without failing.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    return next();
  } catch {
    return next();
  }
}

/**
 * Unified middleware to check if the requester is either a User or a Lawyer.
 * It will set req.user if a regular user, or req.lawyer if a lawyer.
 */
export async function requireUserOrLawyer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    let account;
    if (payload.role === "lawyer") {
      account = await Lawyer.findById(payload.sub);
      if (!account || !account.isActive) {
        return res.status(403).json({ message: "Lawyer not active or not found" });
      }
      req.lawyer = account;
    } else {
      account = await User.findById(payload.sub);
      if (!account || !account.isActive) {
        return res.status(403).json({ message: "User not active or not found" });
      }
      req.user = payload;
    }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}

/**
 * Blocks access for users whose email address has not been verified yet.
 *
 * Wire this AFTER requireAuth on any route that should be gated:
 *   router.get("/sensitive", requireAuth, requireVerifiedEmail, handler)
 *
 * Lawyers are always treated as verified (their email is checked at admin
 * approval time, and they don't go through our OTP flow).
 * Google-authenticated users are also pre-verified by Google.
 */
export async function requireVerifiedEmail(req, res, next) {
  // Lawyers bypass this check — they use a separate verification workflow
  if (req.user?.role === "lawyer") return next();

  try {
    // Dynamically import here to avoid circular deps; User is only needed for this check
    const { User } = await import("../modules/users/user.model.js");
    const user = await User.findById(req.user.sub).select("isEmailVerified");

    if (!user) {
      return res.status(401).json({ message: "Account not found" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email before continuing.",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    return next();
  } catch {
    return res.status(500).json({ message: "Server error during email verification check" });
  }
}