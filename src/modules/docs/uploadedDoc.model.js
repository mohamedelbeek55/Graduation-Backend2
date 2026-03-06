import mongoose from "mongoose";

const uploadedDocSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalFilename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    mimeType: { type: String },
    docType: { type: String, enum: ["contract", "complaint", "other"], default: "other" },
    status: { type: String, enum: ["uploaded", "processing", "done", "failed"], default: "uploaded" }
  },
  { timestamps: true }
);

export const UploadedDoc = mongoose.model("UploadedDoc", uploadedDocSchema);