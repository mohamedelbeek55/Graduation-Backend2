import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true },

    role: { type: String, enum: ["user", "assistant", "system"], required: true },

    content: { type: String, required: true },

    // optional: store references to docs/procedures/templates later
    citations: { type: Array, default: [] },

    // store any debug/metadata (latency, model, etc.)
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);