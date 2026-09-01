import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../utils/asyncHandler.js";

import { User } from "../users/user.model.js";
import { Lawyer } from "../lawyers/lawyer.model.js";
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
    Lawyer.countDocuments({}), // ✅ Fixed: lawyers live in their own collection
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

  const [usersList, lawyersList, usersTotal, lawyersTotal] = await Promise.all([
    User.find(filter)
      .select("fullName email role isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Lawyer.find(filter)
      .select("fullName email role isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
    Lawyer.countDocuments(filter)
  ]);

  // Merge and sort by date
  const items = [...usersList, ...lawyersList]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  const total = usersTotal + lawyersTotal;

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

  // Check both collections
  let account = await User.findById(id);
  let collection = User;
  
  if (!account) {
    account = await Lawyer.findById(id);
    collection = Lawyer;
  }

  if (!account) return res.status(404).json({ message: "Account not found" });

  account.isActive = !account.isActive;
  await account.save();

  return res.json({
    user: { id: account._id, isActive: account.isActive }
  });
});

// ============================
// Update User (CRUD - Update)
// ============================
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    fullName, email, role, phone, governorate, city, address, 
    specialties, pricePerSession, sessionDurationMins, 
    communicationMethods, successRate, isActive, isAvailable, password 
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  // Check both collections
  let account = await User.findById(id);
  let isUser = true;
  if (!account) {
    account = await Lawyer.findById(id);
    isUser = false;
  }
  
  if (!account) return res.status(404).json({ message: "Account not found" });

  if (fullName) account.fullName = fullName;
  if (email) account.email = email;
  if (phone) account.phone = phone;
  if (isActive !== undefined) account.isActive = isActive;

  // Handle Role Change / Migration (Crucial for system integrity)
  if (isUser && role === "lawyer") {
    // Migrate User -> Lawyer
    const passwordHash = password ? await bcrypt.hash(password, 10) : account.passwordHash;
    const newLawyer = await Lawyer.create({
      fullName: fullName || account.fullName,
      email: email || account.email,
      passwordHash: passwordHash,
      phone: phone || account.phone || "",
      isActive: isActive !== undefined ? isActive : account.isActive,
      isVerified: true
    });
    
    // Update all consultations related to this user to point to the new lawyer ID
    // if the user was acting as a lawyer previously or if we want to move their identity
    await Consultation.updateMany(
      { lawyerId: id },
      { lawyerId: newLawyer._id }
    );
    
    await User.findByIdAndDelete(id);
    return res.json({ message: "User migrated to Lawyer successfully", user: newLawyer });
  }

  // Role specific updates
  if (account.role === "lawyer" || role === "lawyer") {
    if (governorate) account.governorate = governorate;
    if (city) account.city = city;
    if (address) account.address = address;
    if (specialties) account.specialties = Array.isArray(specialties) ? specialties : specialties.split(",").map(s => s.trim());
    if (pricePerSession !== undefined) account.pricePerSession = Number(pricePerSession);
    if (sessionDurationMins !== undefined) account.sessionDurationMins = Number(sessionDurationMins);
    if (communicationMethods) account.communicationMethods = communicationMethods;
    if (successRate !== undefined) account.successRate = Number(successRate);
    if (isAvailable !== undefined) account.isAvailable = isAvailable;
  } else {
    if (role) account.role = role;
  }

  if (password) {
    account.passwordHash = await bcrypt.hash(password, 10);
  }

  await account.save();

  return res.json({ message: "Account updated successfully", user: account });
});

// ============================
// Delete User (CRUD - Delete)
// ============================
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const deletedUser = await User.findByIdAndDelete(id);
  const deletedLawyer = await Lawyer.findByIdAndDelete(id);
  
  if (!deletedUser && !deletedLawyer) {
    return res.status(404).json({ message: "Account not found" });
  }

  return res.json({ message: "Account deleted successfully" });
});

// ============================
// Create User (CRUD - Create)
// ============================
export const createUser = asyncHandler(async (req, res) => {
  const { 
    fullName, email, password, role, 
    phone, bio, governorate, city, address, 
    specialties, pricePerSession, sessionDurationMins, 
    communicationMethods, successRate, isVerified, isActive, isAvailable 
  } = req.body;

  // Check if email already exists in either collection
  const userExists = await User.findOne({ email });
  const lawyerExists = await Lawyer.findOne({ email });
  
  if (userExists || lawyerExists) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (role === "lawyer") {
    const lawyer = await Lawyer.create({
      fullName,
      email,
      passwordHash,
      phone: phone || "",
      bio: bio || "",
      governorate: governorate || "",
      city: city || "",
      address: address || "",
      specialties: Array.isArray(specialties) ? specialties : (specialties ? specialties.split(",").map(s => s.trim()) : []),
      pricePerSession: Number(pricePerSession) || 0,
      sessionDurationMins: Number(sessionDurationMins) || 30,
      communicationMethods: communicationMethods || "both",
      successRate: Number(successRate) || 0,
      isVerified: isVerified !== undefined ? isVerified : true,
      isActive: isActive !== undefined ? isActive : true,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });
    return res.status(201).json({ message: "Lawyer created successfully", user: lawyer });
  } else {
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: role || "user",
      phone: phone || "",
      isActive: isActive !== undefined ? isActive : true
    });
    return res.status(201).json({ message: "User created successfully", user });
  }
});

// ============================
// �� List Consultations
// ============================
export const listConsultations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

  const total = await Consultation.countDocuments({});
  const items = await Consultation.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("userId", "fullName email")
    .populate("lawyerId", "fullName email");

  // Format for the frontend table
  const consultations = items.map(c => ({
    _id: c._id,
    id: c._id,
    client_name: c.userId ? c.userId.fullName : "Unknown",
    lawyer_name: c.lawyerId ? c.lawyerId.fullName : "Unknown",
    status: c.status,
    type: c.type,
    notes: c.notes,
    createdAt: c.createdAt,
    userId: c.userId,
    lawyerId: c.lawyerId
  }));

  return res.json({ 
    page, 
    limit, 
    total, 
    items: consultations,
    consultations: consultations // Backward compatibility
  });
});