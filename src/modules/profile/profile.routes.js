import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { avatarUpload } from "../../middlewares/avatarUpload.middleware.js";
import { getProfile, updateProfile, uploadAvatar, getNotifications, markNotificationsRead } from "./profile.controller.js";

const router = Router();

router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, updateProfile);
router.post("/avatar", requireAuth, avatarUpload, uploadAvatar);
router.get("/notifications", requireAuth, getNotifications);
router.patch("/notifications/read", requireAuth, markNotificationsRead);

export default router;