import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  getStats,
  listUsers,
  toggleUserActive,
  updateUser,
  deleteUser,
  createUser,
  listConsultations
} from "./admin.controller.js";

const router = Router();

// Admin only
router.use(requireAuth, requireRole("admin"));

router.get("/stats", getStats);
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id/toggle-active", toggleUserActive);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/consultations", listConsultations);

export default router;