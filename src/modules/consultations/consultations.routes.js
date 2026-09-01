import { Router } from "express";
import { requireAuth, requireRole, requireUserOrLawyer } from "../../middlewares/auth.middleware.js";
import { requireLawyerAuth } from "../../middlewares/lawyerAuth.middleware.js";

import {
  createConsultation,
  myConsultations,
  updateStatus,
  getMessages,
  sendMessage,
  myConsultationsAsLawyer
} from "./consultations.controller.js";

const router = Router();

/**
 * COMMON (Both User and Lawyer can use these)
 */
router.get("/:id/messages", requireUserOrLawyer, getMessages);
router.post("/:id/messages", requireUserOrLawyer, sendMessage);

/**
 * STATUS (Admin or Lawyer owner)
 */
router.patch("/:id/status", requireUserOrLawyer, updateStatus);

/**
 * PUT /api/bookings/:id - Alias or direct for status update as requested
 */
router.put("/:id", requireUserOrLawyer, updateStatus);

/**
 * USER
 */
router.post("/", requireAuth, createConsultation);
router.get("/my", requireAuth, myConsultations);

/**
 * LAWYER
 */
router.get("/lawyer/me", requireLawyerAuth, myConsultationsAsLawyer);

export default router;