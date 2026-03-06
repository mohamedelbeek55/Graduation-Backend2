import { UploadedDoc } from "./uploadedDoc.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const uploadDoc = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Missing file" });

  const fileUrl = req.file.path || req.file.secure_url;
  const publicId = req.file.filename || req.file.public_id;

  if (!fileUrl || !publicId) {
    return res.status(500).json({ message: "Upload failed: missing cloudinary fields" });
  }

  const doc = await UploadedDoc.create({
    userId: req.user.sub,
    originalFilename: req.file.originalname,
    fileUrl,
    publicId,
    mimeType: req.file.mimetype,
    docType: req.body.docType || "other"
  });

  res.status(201).json({ doc });
});

export const listMyDocs = asyncHandler(async (req, res) => {
  const docs = await UploadedDoc.find({ userId: req.user.sub }).sort({ createdAt: -1 });
  res.json({ docs });
});

export const getDoc = asyncHandler(async (req, res) => {
  const doc = await UploadedDoc.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ doc });
});