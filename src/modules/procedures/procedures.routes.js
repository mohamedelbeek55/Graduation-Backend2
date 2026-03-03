import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  createProcedure,
  updateProcedure,
  deleteProcedure,
  listProcedures,
  getProcedure
} from "./procedures.controller.js";

const router = Router();

// For app/web (reads)
router.get("/", listProcedures);
router.get("/:id", getProcedure);

// Dashboard (admin only)
router.post("/", requireAuth, requireRole("admin"), createProcedure);
router.patch("/:id", requireAuth, requireRole("admin"), updateProcedure);
router.delete("/:id", requireAuth, requireRole("admin"), deleteProcedure);

export default router;