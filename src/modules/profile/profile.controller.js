import { User } from "../users/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import z from "zod";
import { cloudinary } from "../../config/cloudinary.js";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional()
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select(
    "fullName email role phone bio avatarUrl isActive createdAt"
  );
  if (!user) return res.status(404).json({ message: "Not found" });
  return res.json({ user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);

  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: "Not found" });

  if (typeof data.fullName === "string") user.fullName = data.fullName;
  if (typeof data.phone === "string") user.phone = data.phone;
  if (typeof data.bio === "string") user.bio = data.bio;

  await user.save();

  return res.json({
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive
    }
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Missing avatar file" });

  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: "Not found" });

  // delete old avatar if exists
  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    } catch {
      // ignore
    }
  }

  user.avatarUrl = req.file.path;       // URL
  user.avatarPublicId = req.file.filename; // public_id
  await user.save();

  return res.json({
    user: {
      id: user._id,
      avatarUrl: user.avatarUrl
    }
  });
});