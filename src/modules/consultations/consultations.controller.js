import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Consultation } from "./consultation.model.js";
import { ConsultationMessage } from "./message.model.js";
import { Lawyer } from "../lawyers/lawyer.model.js";

/**
 * Create Consultation (User)
 */
const createSchema = z.object({
  lawyerId: z.string().min(1),
  notes: z.string().optional()
});

export const createConsultation = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);

  const lawyer = await Lawyer.findById(data.lawyerId);
  if (!lawyer || !lawyer.isActive || !lawyer.isVerified) {
    return res.status(400).json({ message: "Invalid lawyer" });
  }

  const c = await Consultation.create({
    userId: req.user.sub,
    lawyerId: data.lawyerId,
    type: "chat",
    status: "pending",
    notes: data.notes || ""
  });

  res.status(201).json({ consultation: c });
});

/**
 * My consultations (User)
 */
export const myConsultations = asyncHandler(async (req, res) => {
  const items = await Consultation.find({ userId: req.user.sub })
    .populate("lawyerId", "fullName governorate specialties ratingAvg pricePerSession")
    .sort({ createdAt: -1 });

  res.json({ consultations: items });
});

/**
 * Update status (Admin or Lawyer owner)
 */
const statusSchema = z.object({
  status: z.enum(["pending", "accepted", "closed", "canceled", "active", "confirmed", "declined"])
});

export const updateStatus = asyncHandler(async (req, res) => {
  const data = statusSchema.parse(req.body);
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  // Allow if admin OR if lawyer owner
  const isAdmin = req.user && req.user.role === "admin";
  const isLawyerOwner = req.lawyer && String(consultation.lawyerId) === String(req.lawyer._id);

  if (!isAdmin && !isLawyerOwner) {
    return res.status(403).json({ message: "Forbidden" });
  }

  consultation.status = data.status;
  await consultation.save();

  res.json({ consultation });
});

/**
 * Messages schema
 */
const sendSchema = z.object({
  message: z.string().min(1)
});

/**
 * Unified send message (User or Lawyer)
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  let senderType = "";
  let senderId = "";

  if (req.user) {
    // Check if user owns it
    if (String(consultation.userId) !== String(req.user.sub)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    senderType = "user";
    senderId = req.user.sub;
  } else if (req.lawyer) {
    // Check if lawyer owns it
    if (String(consultation.lawyerId) !== String(req.lawyer._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    senderType = "lawyer";
    senderId = req.lawyer._id;
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const msg = await ConsultationMessage.create({
    consultationId: consultation._id,
    senderType,
    senderId,
    message: data.message
  });

  res.status(201).json({ message: msg });
});

/**
 * Unified get messages (User or Lawyer)
 */
export const getMessages = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  const isUserOwner = req.user && String(consultation.userId) === String(req.user.sub);
  const isLawyerOwner = req.lawyer && String(consultation.lawyerId) === String(req.lawyer._id);
  const isAdmin = req.user && req.user.role === "admin";

  if (!isUserOwner && !isLawyerOwner && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const messages = await ConsultationMessage.find({
    consultationId: consultation._id
  }).sort({ createdAt: 1 });

  res.json({ messages });
});

/**
 * My consultations (Lawyer)
 * requires requireLawyerAuth middleware (sets req.lawyer)
 */
export const myConsultationsAsLawyer = asyncHandler(async (req, res) => {
  const items = await Consultation.find({ lawyerId: req.lawyer._id })
    .populate("userId", "fullName email")
    .sort({ createdAt: -1 });

  res.json({ consultations: items });
});