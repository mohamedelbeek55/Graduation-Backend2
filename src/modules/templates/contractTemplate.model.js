import mongoose from "mongoose";

const clauseSchema = new mongoose.Schema(
  {
    clauseTitle: { type: String, required: true },
    originalText: { type: String, required: true },
    explanation: { type: String, default: "" },
    userInputs: [{ type: String }]
  },
  { _id: false }
);

const contractTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // اسم التمبليت
    type: { type: String, required: true },  // Contract_Type
    sourceFile: { type: String, default: "" },
    clauses: [clauseSchema],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

contractTemplateSchema.index({ title: "text", type: "text", tags: "text" });

export const ContractTemplate = mongoose.model("ContractTemplate", contractTemplateSchema);