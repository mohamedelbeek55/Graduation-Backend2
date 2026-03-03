import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "LexaGuide/docs",
    resource_type: "auto"
  })
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});