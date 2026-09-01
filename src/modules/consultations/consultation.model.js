import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lawyer", required: true },

    type: { type: String, enum: ["chat", "video"], default: "chat" },
    status: {
      type: String,
      enum: ["pending", "accepted", "closed", "canceled", "active", "confirmed", "declined", "completed"],
      default: "pending"
    },

    scheduledAt: { type: Date },
    price: { type: Number, default: 0 },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

consultationSchema.index({ userId: 1, createdAt: -1 });
consultationSchema.index({ lawyerId: 1, createdAt: -1 });

export const Consultation = mongoose.model("Consultation", consultationSchema);