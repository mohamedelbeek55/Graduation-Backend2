import { User } from "../users/user.model.js";
import { Lawyer } from "../lawyers/lawyer.model.js";
import { Consultation } from "../consultations/consultation.model.js";
import { GeneratedDocument } from "../generated/generated.model.js";
import { Notification } from "../users/notification.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import z from "zod";
import { cloudinary } from "../../config/cloudinary.js";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional()
});

export const getProfile = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  let account;
  let extraData = {};

  if (role === "lawyer") {
    account = await Lawyer.findById(sub).select("-passwordHash");
    if (!account) return res.status(404).json({ message: "Lawyer not found" });

    // Fetch lawyer specific data
    const [consultations] = await Promise.all([
      Consultation.find({ lawyerId: sub })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "fullName email avatarUrl")
    ]);

    extraData = {
      consultations,
      stats: {
        ratingAvg: account.ratingAvg || 0,
        ratingCount: account.ratingCount || 0,
        successRate: account.successRate || 0,
        totalConsultations: consultations.length
      }
    };
  } else {
    account = await User.findById(sub).select("-passwordHash -refreshTokens");
    if (!account) return res.status(404).json({ message: "User not found" });

    // Fetch user specific data
    const [consultations, documents] = await Promise.all([
      Consultation.find({ userId: sub })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("lawyerId", "fullName email avatarUrl specialties"),
      GeneratedDocument.find({ userId: sub })
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    extraData = {
      consultations,
      documents,
      stats: {
        totalConsultations: consultations.length,
        totalDocuments: documents.length
      }
    };
  }

  return res.json({
    user: account,
    ...extraData
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const { sub, role } = req.user;
  let account;

  if (role === "lawyer") {
    account = await Lawyer.findById(sub);
  } else {
    account = await User.findById(sub);
  }

  if (!account) return res.status(404).json({ message: "Account not found" });

  if (typeof data.fullName === "string") account.fullName = data.fullName;
  if (typeof data.phone === "string") account.phone = data.phone;
  if (typeof data.bio === "string") account.bio = data.bio;

  await account.save();

  return res.json({
    user: {
      id: account._id,
      fullName: account.fullName,
      email: account.email,
      role: account.role || role,
      phone: account.phone,
      bio: account.bio,
      avatarUrl: account.avatarUrl,
      isActive: account.isActive
    }
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Missing avatar file" });
  const { sub, role } = req.user;
  let account;

  if (role === "lawyer") {
    account = await Lawyer.findById(sub);
  } else {
    account = await User.findById(sub);
  }

  if (!account) return res.status(404).json({ message: "Account not found" });

  // delete old avatar if exists
  if (account.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(account.avatarPublicId);
    } catch {
      // ignore
    }
  }

  account.avatarUrl = req.file.path;       // URL
  account.avatarPublicId = req.file.filename; // public_id
  await account.save();

  return res.json({
    user: {
      id: account._id,
      avatarUrl: account.avatarUrl
    }
  });
});


export const getNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ userId: req.user.sub })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json({ notifications: items });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.sub, isRead: false },
    { $set: { isRead: true } }
  );
  return res.json({ ok: true });
});