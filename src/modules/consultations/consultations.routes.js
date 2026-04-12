import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
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
router.get("/:id/messages", (req, res, next) => {
  // Try User Auth first, then Lawyer Auth
  requireAuth(req, res, (err) => {
    if (!err) return getMessages(req, res, next);
    requireLawyerAuth(req, res, (err2) => {
      if (!err2) return getMessages(req, res, next);
      return res.status(401).json({ message: "Unauthorized" });
    });
  });
});

router.post("/:id/messages", (req, res, next) => {
  requireAuth(req, res, (err) => {
    if (!err) return sendMessage(req, res, next);
    requireLawyerAuth(req, res, (err2) => {
      if (!err2) return sendMessage(req, res, next);
      return res.status(401).json({ message: "Unauthorized" });
    });
  });
});

/**
 * STATUS (Admin or Lawyer owner)
 */
router.patch("/:id/status", (req, res, next) => {
  requireAuth(req, res, (err) => {
    if (!err) return updateStatus(req, res, next);
    requireLawyerAuth(req, res, (err2) => {
      if (!err2) return updateStatus(req, res, next);
      return res.status(401).json({ message: "Unauthorized" });
    });
  });
});

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