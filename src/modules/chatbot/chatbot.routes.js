import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createSession,
  mySessions,
  getSession,
  sendMessage,
  archiveSession,
  deleteSession
} from "./chatbot.controller.js";

const router = Router();

// all are for logged-in users
router.post("/sessions", requireAuth, createSession);
router.get("/sessions", requireAuth, mySessions);
router.get("/sessions/:id", requireAuth, getSession);

router.post("/sessions/:id/messages", requireAuth, sendMessage);

router.patch("/sessions/:id/archive", requireAuth, archiveSession);
router.delete("/sessions/:id", requireAuth, deleteSession);

export default router;