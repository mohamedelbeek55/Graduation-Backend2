import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Notification } from "./notification.model.js";

const router = Router();

// Get my notifications
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);
  
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  
  res.json({ notifications, unreadCount });
}));

// Mark all as read
router.patch("/read-all", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  res.json({ ok: true });
}));

// Mark single as read
router.patch("/:id/read", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Not found" });
  res.json({ notification });
}));

export default router;
