import z from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { GeneratedDocument } from "./generated.model.js";
import { ComplaintTemplate } from "../templates/complaintTemplate.model.js";
import { ContractTemplate } from "../templates/contractTemplate.model.js";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyInputs(text, inputs) {
  let out = text;
  for (const [key, val] of Object.entries(inputs || {})) {
    const safeKey = escapeRegExp(String(key));
    const re = new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, "g");
    out = out.replace(re, String(val));
  }
  return out;
}

function extractPlaceholders(text) {
  const set = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}

function buildFinalTextFromClauses(clauses) {
  return (clauses || [])
    .map((c) => {
      const title = c.clauseTitle ? `# ${c.clauseTitle}\n` : "";
      const body = c.originalText || "";
      return `${title}${body}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

const createSchema = z.object({
  templateId: z.string().min(1),
  templateKind: z.enum(["complaint", "contract"]).optional().default("complaint"),
  userInputs: z.object({}).passthrough().default({})
});

export const createGenerated = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);

  const isContract = data.templateKind === "contract";
  const TemplateModel = isContract ? ContractTemplate : ComplaintTemplate;

  const template = await TemplateModel.findById(data.templateId);
  if (!template) return res.status(404).json({ message: "Template not found" });

  // 1) base text (clauses)
  const baseText = buildFinalTextFromClauses(template.clauses);

  // 2) replace placeholders
  const finalText = applyInputs(baseText, data.userInputs);

  // 3) missing fields detection (from placeholders + clause userInputs list)
  const missing = new Set();

  // placeholders like {{party1}}
  for (const key of extractPlaceholders(baseText)) {
    const v = data.userInputs?.[key];
    if (v === undefined || v === null || String(v).trim() === "") missing.add(key);
  }

  // explicit required inputs from dataset
  for (const c of template.clauses || []) {
    for (const key of c.userInputs || []) {
      const v = data.userInputs?.[key];
      if (v === undefined || v === null || String(v).trim() === "") missing.add(key);
    }
  }

  const doc = await GeneratedDocument.create({
    userId: req.user.sub,
    templateModel: isContract ? "ContractTemplate" : "ComplaintTemplate",
    templateId: template._id,
    templateTitle: template.title,
    userInputs: data.userInputs,
    finalText,
    status: "draft"
  });

  return res.status(201).json({
    document: doc,
    missingFields: Array.from(missing)
  });
});

export const myGenerated = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

  const filter = { userId: req.user.sub };

  const [items, total] = await Promise.all([
    GeneratedDocument.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    GeneratedDocument.countDocuments(filter)
  ]);

  return res.json({ page, limit, total, documents: items });
});

export const getGenerated = asyncHandler(async (req, res) => {
  const doc = await GeneratedDocument.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json({ document: doc });
});

export const finalizeGenerated = asyncHandler(async (req, res) => {
  const updated = await GeneratedDocument.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub },
    { status: "finalized" },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Not found" });

  return res.json({ document: updated });
});