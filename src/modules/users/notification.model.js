import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["booking_accepted", "new_message", "info"], default: "info" },
    isRead: { type: Boolean, default: false },
    link: { type: String }, // Optional link to redirect (e.g. /html/user-consultations.html?id=...)
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);