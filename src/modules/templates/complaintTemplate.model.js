import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, default: "text" }
  },
  { _id: false }
);

const clauseSchema = new mongoose.Schema(
  {
    clauseTitle: { type: String, required: true },
    originalText: { type: String, required: true },
    explanation: { type: String, default: "" },
    userInputs: [{ type: String }]
  },
  { _id: false }
);

const complaintTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // اسم التمبليت
    type: { type: String, required: true },  // Complaint_Type
    sourceFile: { type: String, default: "" },
    clauses: [clauseSchema], // Old style
    content: { type: String }, // New style: Full template containing placeholders like {{name}}
    fields: [fieldSchema],     // New style: Required dynamic inputs metadata
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

complaintTemplateSchema.index({ title: "text", type: "text", tags: "text" });

export const ComplaintTemplate = mongoose.model("ComplaintTemplate", complaintTemplateSchema);