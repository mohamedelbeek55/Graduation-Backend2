import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  // complaints
  listComplaintTemplates,
  getComplaintTemplate,
  updateComplaintTemplate,
  deleteComplaintTemplate,
  // contracts
  listContractTemplates,
  getContractTemplate,
  updateContractTemplate,
  deleteContractTemplate
} from "./templates.controller.js";

const router = Router();

// =====================
// Public
// =====================

// Complaints
router.get("/complaints", listComplaintTemplates);
router.get("/complaints/:id", getComplaintTemplate);

// Contracts
router.get("/contracts", listContractTemplates);
router.get("/contracts/:id", getContractTemplate);

// =====================
// Admin
// =====================

// Complaints admin
router.patch("/complaints/:id", requireAuth, requireRole("admin"), updateComplaintTemplate);
router.delete("/complaints/:id", requireAuth, requireRole("admin"), deleteComplaintTemplate);

// Contracts admin
router.patch("/contracts/:id", requireAuth, requireRole("admin"), updateContractTemplate);
router.delete("/contracts/:id", requireAuth, requireRole("admin"), deleteContractTemplate);

export default router;