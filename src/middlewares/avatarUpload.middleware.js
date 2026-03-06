import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "LexaGuide/avatars",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"]
  })
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single("avatar");