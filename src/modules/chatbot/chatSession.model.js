import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, default: "New Chat" },

    status: { type: String, enum: ["active", "archived"], default: "active" },

    // Optional metadata for future AI routing
    meta: { type: Object, default: {} },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

chatSessionSchema.index({ userId: 1, createdAt: -1 });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);