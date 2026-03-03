import mongoose from "mongoose";

const procedureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // مثال: استخراج شهادة ميلاد
    category: { type: String, required: true, trim: true }, // عربي زي: أحوال مدنية
    categoryKey: {
        type: String,
        enum: ["civil", "id", "passport", "notary", "courts", "other"],
        default: "other"
},
    summary: { type: String, default: "" },

    channels: {
      online: { type: Boolean, default: false },
      offline: { type: Boolean, default: true }
    },

    // الأوراق المطلوبة
    requiredDocuments: [
      {
        name: { type: String, required: true }, // بطاقة شخصية
        notes: { type: String, default: "" } // أصل/صورة/صلاحية
      }
    ],

    // خطوات الإجراء
    steps: [
      {
        order: { type: Number, required: true },
        title: { type: String, required: true },
        details: { type: String, default: "" }
      }
    ],

    // رسوم / مدة تقريبية
    fees: {
      amountEgp: { type: Number, default: 0 },
      notes: { type: String, default: "" }
    },
    eta: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: ["hours", "days", "weeks"], default: "days" },
      notes: { type: String, default: "" }
    },

    // أماكن/روابط
    locations: [
      {
        governorate: { type: String, default: "" },
        address: { type: String, default: "" },
        notes: { type: String, default: "" }
      }
    ],
    links: [
      {
        title: { type: String, default: "" },
        url: { type: String, default: "" }
      }
    ],

    // بحث سريع
    tags: [{ type: String }],

    // Dashboard control
    isActive: { type: Boolean, default: true },

    // من أنشأه
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

procedureSchema.index({ title: "text", tags: "text", summary: "text" });

export const Procedure = mongoose.model("Procedure", procedureSchema);