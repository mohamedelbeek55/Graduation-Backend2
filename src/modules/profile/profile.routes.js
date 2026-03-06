import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { avatarUpload } from "../../middlewares/avatarUpload.middleware.js";
import { getProfile, updateProfile, uploadAvatar } from "./profile.controller.js";

const router = Router();

router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, updateProfile);
router.post("/avatar", requireAuth, avatarUpload, uploadAvatar);

export default router;