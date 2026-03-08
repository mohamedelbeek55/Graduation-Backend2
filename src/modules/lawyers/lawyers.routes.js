import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  registerLawyer,
  loginLawyer,
  listLawyers,
  listPendingLawyers,
  verifyLawyer,
  setLawyerActive,
  createLawyerAdmin,
  updateLawyerAdmin,
  deleteLawyerAdmin
} from "./lawyers.controller.js";

const router = Router();

// Lawyer auth
router.post("/register", registerLawyer);
router.post("/login", loginLawyer);

// Public list/search
router.get("/", listLawyers);

// Admin dashboard
router.get("/pending", requireAuth, requireRole("admin"), listPendingLawyers);
router.patch("/:id/verify", requireAuth, requireRole("admin"), verifyLawyer);
router.patch("/:id/active", requireAuth, requireRole("admin"), setLawyerActive);
router.post("/", requireAuth, requireRole("admin"), createLawyerAdmin);
router.patch("/:id", requireAuth, requireRole("admin"), updateLawyerAdmin);
router.delete("/:id", requireAuth, requireRole("admin"), deleteLawyerAdmin);

export default router;
