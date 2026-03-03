import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Lawyer } from "./lawyer.model.js";

const registerLawyerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  bio: z.string().optional(),
  governorate: z.string().optional(),
  address: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  pricePerSession: z.number().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function signLawyerToken({ sub }) {
  return jwt.sign({ sub, role: "lawyer" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m"
  });
}

// ✅ Lawyer register (تسجيل محامي) - بيبقى isVerified=false لحد الأدمن يوافق
export const registerLawyer = asyncHandler(async (req, res) => {
  const data = registerLawyerSchema.parse(req.body);

  const exists = await Lawyer.findOne({ email: data.email });
  if (exists) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(data.password, 10);

  const lawyer = await Lawyer.create({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone || "",
    passwordHash,
    bio: data.bio || "",
    governorate: data.governorate || "",
    address: data.address || "",
    specialties: data.specialties || [],
    pricePerSession: data.pricePerSession || 0,
    isVerified: false,
    isActive: true
  });

  res.status(201).json({
    lawyer: {
      id: lawyer._id,
      fullName: lawyer.fullName,
      email: lawyer.email,
      isVerified: lawyer.isVerified
    }
  });
});

// ✅ Lawyer login
export const loginLawyer = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const lawyer = await Lawyer.findOne({ email: data.email });
  if (!lawyer) return res.status(401).json({ message: "Invalid credentials" });

  if (!lawyer.isActive) return res.status(403).json({ message: "Account disabled" });
  if (!lawyer.isVerified) return res.status(403).json({ message: "Not verified yet" });

  const ok = await bcrypt.compare(data.password, lawyer.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = signLawyerToken({ sub: lawyer._id.toString() });

  res.json({
    lawyer: { id: lawyer._id, fullName: lawyer.fullName, email: lawyer.email },
    accessToken
  });
});

// ✅ Public list/search lawyers (للمستخدمين)
export const listLawyers = asyncHandler(async (req, res) => {
  const { q, governorate, specialty } = req.query;

  const filter = { isActive: true, isVerified: true };

  if (governorate) filter.governorate = String(governorate);
  if (specialty) filter.specialties = String(specialty);

  let query = Lawyer.find(filter);

  if (q) {
    query = Lawyer.find({ ...filter, $text: { $search: String(q) } });
  }

  const lawyers = await query
    .select("fullName bio governorate specialties pricePerSession ratingAvg ratingCount")
    .sort({ ratingAvg: -1 })
    .limit(50);

  res.json({ lawyers });
});

// ✅ Admin: list pending lawyers
export const listPendingLawyers = asyncHandler(async (req, res) => {
  const lawyers = await Lawyer.find({ isVerified: false })
    .select("fullName email governorate specialties createdAt isActive")
    .sort({ createdAt: -1 });

  res.json({ lawyers });
});

// ✅ Admin: verify lawyer
export const verifyLawyer = asyncHandler(async (req, res) => {
  const updated = await Lawyer.findByIdAndUpdate(
    req.params.id,
    { isVerified: true },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Not found" });

  res.json({ lawyer: updated });
});

// ✅ Admin: enable/disable lawyer
export const setLawyerActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const updated = await Lawyer.findByIdAndUpdate(
    req.params.id,
    { isActive: Boolean(isActive) },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Not found" });

  res.json({ lawyer: updated });
});