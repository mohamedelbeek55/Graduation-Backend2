import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { requireLawyerAuth } from "../../middlewares/lawyerAuth.middleware.js";

import {
  createConsultation,
  myConsultations,
  updateStatus,

  sendMessageAsUser,
  getMessagesAsUser,

  myConsultationsAsLawyer,
  sendMessageAsLawyer,
  getMessagesAsLawyer
} from "./consultations.controller.js";

const router = Router();

/**
 * USER
 */
router.post("/", requireAuth, createConsultation);
router.get("/my", requireAuth, myConsultations);

router.post("/:id/messages", requireAuth, sendMessageAsUser);
router.get("/:id/messages", requireAuth, getMessagesAsUser);

/**
 * ADMIN (temporary status control)
 */
router.patch("/:id/status", requireAuth, requireRole("admin"), updateStatus);

/**
 * LAWYER
 */
router.get("/lawyer/my", requireLawyerAuth, myConsultationsAsLawyer);

router.post("/:id/messages/lawyer", requireLawyerAuth, sendMessageAsLawyer);
router.get("/:id/messages/lawyer", requireLawyerAuth, getMessagesAsLawyer);

export default router;