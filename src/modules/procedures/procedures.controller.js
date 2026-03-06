import { z } from "zod";
import { Procedure } from "./procedure.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createSchema = z.object({
  title: z.string().min(2),
  category: z.string().optional(),
  summary: z.string().optional(),
  channels: z
    .object({
      online: z.boolean().optional(),
      offline: z.boolean().optional()
    })
    .optional(),
  requiredDocuments: z
    .array(z.object({ name: z.string().min(1), notes: z.string().optional() }))
    .optional(),
  steps: z
    .array(z.object({ order: z.number().int().min(1), title: z.string().min(1), details: z.string().optional() }))
    .optional(),
  fees: z.object({ amountEgp: z.number().optional(), notes: z.string().optional() }).optional(),
  eta: z.object({ value: z.number().optional(), unit: z.string().optional(), notes: z.string().optional() }).optional(),
  locations: z
    .array(z.object({ governorate: z.string().optional(), address: z.string().optional(), notes: z.string().optional() }))
    .optional(),
  links: z.array(z.object({ title: z.string().optional(), url: z.string().optional() })).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export const createProcedure = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);

  const created = await Procedure.create({
    ...data,
    createdBy: req.user.sub,
    updatedBy: req.user.sub
  });

  res.status(201).json({ procedure: created });
});

export const updateProcedure = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);

  const updated = await Procedure.findByIdAndUpdate(
    req.params.id,
    { ...data, updatedBy: req.user.sub },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json({ procedure: updated });
});

export const deleteProcedure = asyncHandler(async (req, res) => {
  const deleted = await Procedure.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

// Public-ish (for app/chatbot): list + search
export const listProcedures = asyncHandler(async (req, res) => {
  const { q, category, active } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;

  let query = Procedure.find(filter).sort({ createdAt: -1 });

  if (q) {
    query = Procedure.find({ ...filter, $text: { $search: String(q) } }).sort({ score: { $meta: "textScore" } });
  }

  const items = await query.limit(50);
  res.json({ procedures: items });
});

export const getProcedure = asyncHandler(async (req, res) => {
  const item = await Procedure.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json({ procedure: item });
});