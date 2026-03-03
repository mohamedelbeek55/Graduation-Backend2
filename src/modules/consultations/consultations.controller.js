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
 * Update status (Admin for now)
 */
const statusSchema = z.object({
  status: z.enum(["pending", "accepted", "closed", "canceled"])
});

export const updateStatus = asyncHandler(async (req, res) => {
  const data = statusSchema.parse(req.body);

  const updated = await Consultation.findByIdAndUpdate(
    req.params.id,
    { status: data.status },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Not found" });

  res.json({ consultation: updated });
});

/**
 * Messages schema
 */
const sendSchema = z.object({
  message: z.string().min(1)
});

/**
 * Send message as User
 */
export const sendMessageAsUser = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);

  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  // user must own the consultation
  if (String(consultation.userId) !== String(req.user.sub)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const msg = await ConsultationMessage.create({
    consultationId: consultation._id,
    senderType: "user",
    senderId: req.user.sub,
    message: data.message
  });

  res.status(201).json({ message: msg });
});

/**
 * Get messages as User
 */
export const getMessagesAsUser = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  if (String(consultation.userId) !== String(req.user.sub)) {
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

/**
 * Send message as Lawyer
 */
export const sendMessageAsLawyer = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);

  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  // lawyer must own the consultation
  if (String(consultation.lawyerId) !== String(req.lawyer._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const msg = await ConsultationMessage.create({
    consultationId: consultation._id,
    senderType: "lawyer",
    senderId: req.lawyer._id,
    message: data.message
  });

  res.status(201).json({ message: msg });
});

/**
 * Get messages as Lawyer
 */
export const getMessagesAsLawyer = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return res.status(404).json({ message: "Not found" });

  if (String(consultation.lawyerId) !== String(req.lawyer._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const messages = await ConsultationMessage.find({
    consultationId: consultation._id
  }).sort({ createdAt: 1 });

  res.json({ messages });
});