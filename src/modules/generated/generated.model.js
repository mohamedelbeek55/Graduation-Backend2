import mongoose from "mongoose";

const generatedDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // ✅ dynamic reference (ComplaintTemplate or ContractTemplate)
    templateModel: {
      type: String,
      enum: ["ComplaintTemplate", "ContractTemplate"],
      default: "ComplaintTemplate",
      required: true
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "templateModel"
    },

    templateTitle: { type: String, required: true },

    userInputs: {
      type: Object,
      default: {}
    },

    finalText: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft"
    }
  },
  { timestamps: true }
);

generatedDocumentSchema.index({ userId: 1, createdAt: -1 });

export const GeneratedDocument = mongoose.model("GeneratedDocument", generatedDocumentSchema);