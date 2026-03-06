import { asyncHandler } from "../../utils/asyncHandler.js";
import { ComplaintTemplate } from "./complaintTemplate.model.js";
import { ContractTemplate } from "./contractTemplate.model.js";

function parsePageLimit(req) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  return { page, limit };
}

function buildTextFilter(q) {
  if (!q) return null;
  const s = String(q).trim();
  if (!s) return null;
  return { $text: { $search: s } };
}

/* =========================
   Complaints Templates
========================= */

export const listComplaintTemplates = asyncHandler(async (req, res) => {
  const { page, limit } = parsePageLimit(req);
  const q = req.query.q;

  const filter = { isActive: true, ...(buildTextFilter(q) || {}) };

  const [items, total] = await Promise.all([
    ComplaintTemplate.find(filter)
      .select("title type tags createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ComplaintTemplate.countDocuments(filter)
  ]);

  res.json({ page, limit, total, templates: items });
});

export const getComplaintTemplate = asyncHandler(async (req, res) => {
  const item = await ComplaintTemplate.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json({ template: item });
});

export const updateComplaintTemplate = asyncHandler(async (req, res) => {
  const updated = await ComplaintTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json({ template: updated });
});

export const deleteComplaintTemplate = asyncHandler(async (req, res) => {
  const deleted = await ComplaintTemplate.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

/* =========================
   Contracts Templates
========================= */

export const listContractTemplates = asyncHandler(async (req, res) => {
  const { page, limit } = parsePageLimit(req);
  const q = req.query.q;

  const filter = { isActive: true, ...(buildTextFilter(q) || {}) };

  const [items, total] = await Promise.all([
    ContractTemplate.find(filter)
      .select("title type tags createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ContractTemplate.countDocuments(filter)
  ]);

  res.json({ page, limit, total, templates: items });
});

export const getContractTemplate = asyncHandler(async (req, res) => {
  const item = await ContractTemplate.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json({ template: item });
});

export const updateContractTemplate = asyncHandler(async (req, res) => {
  const updated = await ContractTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json({ template: updated });
});

export const deleteContractTemplate = asyncHandler(async (req, res) => {
  const deleted = await ContractTemplate.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});