import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";

import { User } from "../users/user.model.js";
import { UploadedDoc } from "../docs/uploadedDoc.model.js";
import { Procedure } from "../procedures/procedure.model.js";
import { Consultation } from "../consultations/consultation.model.js";

// ============================
// 📊 Stats
// ============================
export const getStats = asyncHandler(async (req, res) => {
  const [
    users,
    lawyers,
    procedures,
    docs,
    consultations
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "lawyer" }),
    Procedure.countDocuments({}),
    UploadedDoc.countDocuments({}),
    Consultation.countDocuments({})
  ]);

  return res.json({
    stats: { users, lawyers, procedures, docs, consultations }
  });
});

// ============================
// 👥 List Users
// ============================
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const q = (req.query.q || "").toString().trim();

  const filter = {};
  if (q) {
    filter.$or = [
      { fullName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } }
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("fullName email role isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  return res.json({ page, limit, total, items });
});

// ============================
// 🚫 Toggle User Active
// ============================
export const toggleUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = !user.isActive;
  await user.save();

  return res.json({
    user: { id: user._id, isActive: user.isActive }
  });
});

// ============================
// 📋 List Consultations
// ============================
export const listConsultations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

  const items = await Consultation.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("userId", "fullName email")
    .populate("lawyerId", "fullName email");

  const total = await Consultation.countDocuments({});

  return res.json({ page, limit, total, items });
});