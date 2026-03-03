import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true },
    senderType: { type: String, enum: ["user", "lawyer"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

messageSchema.index({ consultationId: 1, createdAt: 1 });

export const ConsultationMessage = mongoose.model("ConsultationMessage", messageSchema);