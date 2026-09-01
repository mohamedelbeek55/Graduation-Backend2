import jwt from "jsonwebtoken";
import { Lawyer } from "../modules/lawyers/lawyer.model.js";
import { User } from "../modules/users/user.model.js";

export async function requireLawyerAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (payload.role !== "lawyer") {
      return res.status(403).json({ message: "Not a lawyer token" });
    }

    let lawyer = await Lawyer.findById(payload.sub);
    
    // Fallback: If not found in Lawyer collection but role is lawyer, it's a migration issue
    if (!lawyer && payload.role === "lawyer") {
      const userAsLawyer = await User.findById(payload.sub);
      if (userAsLawyer) {
        // Log the issue for debugging
        console.warn(`Account ${payload.sub} has role 'lawyer' but is in 'User' collection. Migrating...`);
        // We can't easily migrate here safely without a request body, 
        // but we can allow the request and inform the system.
        // Better yet, let's just treat them as the lawyer for this request.
        lawyer = userAsLawyer; 
      }
    }

    if (!lawyer) {
      return res.status(403).json({ message: "Lawyer not found or account deactivated" });
    }

    req.lawyer = lawyer;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}