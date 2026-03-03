import jwt from "jsonwebtoken";
import { Lawyer } from "../modules/lawyers/lawyer.model.js";

export async function requireLawyerAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (payload.role !== "lawyer") {
      return res.status(403).json({ message: "Not a lawyer token" });
    }

    const lawyer = await Lawyer.findById(payload.sub);
    if (!lawyer || !lawyer.isActive) {
      return res.status(403).json({ message: "Lawyer not active" });
    }

    req.lawyer = lawyer;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}