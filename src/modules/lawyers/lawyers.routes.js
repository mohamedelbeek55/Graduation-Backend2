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
  deleteLawyerAdmin,
  recommendLawyersAI,
  getLawyerById
} from "./lawyers.controller.js";

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post("/register", registerLawyer);
router.post("/login", loginLawyer);

// ─── Static paths FIRST (must come before /:id to avoid shadowing) ───────────
router.get("/pending", requireAuth, requireRole("admin"), listPendingLawyers);
router.post("/recommend", recommendLawyersAI);

// ─── Public list ─────────────────────────────────────────────────────────────
router.get("/", listLawyers);
router.post("/", requireAuth, requireRole("admin"), createLawyerAdmin);

// ─── Parameterised routes last ────────────────────────────────────────────────
router.get("/:id", getLawyerById);
router.patch("/:id/verify", requireAuth, requireRole("admin"), verifyLawyer);
router.patch("/:id/active", requireAuth, requireRole("admin"), setLawyerActive);
router.patch("/:id", requireAuth, requireRole("admin"), updateLawyerAdmin);
router.delete("/:id", requireAuth, requireRole("admin"), deleteLawyerAdmin);

export default router;
