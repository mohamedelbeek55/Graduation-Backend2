import mongoose from "mongoose";

const lawyerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },

    passwordHash: { type: String, required: true }, // login منفصل للمحامين
    role: { type: String, default: "lawyer" }, // ثابت

    bio: { type: String, default: "" },
    governorate: { type: String, default: "" }, // محافظة
    city: { type: String, default: "" }, // مدينة (للمطابقة الدقيقة في الـ AI)
    address: { type: String, default: "" },

    specialties: [{ type: String }], // ["أحوال شخصية", "مدني", ...]
    pricePerSession: { type: Number, default: 0 },
    sessionDurationMins: { type: Number, default: 30 },
    communicationMethods: { type: String, default: "both" }, // "chat", "video_call", "both"

    ratingAvg: { type: Number, default: 0 }, // هنحسبها من reviews
    ratingCount: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }, // نسبة النجاح (للمطابقة الذكية)

    isVerified: { type: Boolean, default: false }, // موافقة الأدمن
    isActive: { type: Boolean, default: true }, // تعطيل/حظر
    isAvailable: { type: Boolean, default: true } // متاح حالياً للترشيح
  },
  { timestamps: true }
);

lawyerSchema.index({ fullName: "text", specialties: "text", governorate: "text" });

export const Lawyer = mongoose.model("Lawyer", lawyerSchema);