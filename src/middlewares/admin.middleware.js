import { requireAuth, requireRole } from "./auth.middleware.js";

export const requireAdmin = [requireAuth, requireRole("admin")];