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