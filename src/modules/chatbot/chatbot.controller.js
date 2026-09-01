import z from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ChatSession } from "./chatSession.model.js";
import { ChatMessage } from "./chatMessage.model.js";
import { Procedure } from "../procedures/procedure.model.js";

// Create session
const createSessionSchema = z.object({
  title: z.string().min(1).optional()
});

export const createSession = asyncHandler(async (req, res) => {
  const data = createSessionSchema.parse(req.body || {});
  const session = await ChatSession.create({
    userId: req.user.sub,
    title: data.title || "New Chat"
  });

  res.status(201).json({ session });
});

// List my sessions
export const mySessions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 50);
  const skip = (page - 1) * limit;

  const filter = { userId: req.user.sub, isDeleted: false };

  const [items, total] = await Promise.all([
    ChatSession.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ChatSession.countDocuments(filter)
  ]);

  res.json({
    page,
    limit,
    total,
    sessions: items
  });
});

// Get one session + messages
export const getSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({
    _id: req.params.id,
    userId: req.user.sub,
    isDeleted: false
  });

  if (!session) return res.status(404).json({ message: "Session not found" });

  const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });

  res.json({ session, messages });
});

// Send message (User) + Smarter assistant response
const sendSchema = z.object({
  content: z.string().min(1)
});

export const sendMessage = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);

  const session = await ChatSession.findOne({
    _id: req.params.id,
    userId: req.user.sub,
    isDeleted: false
  });

  if (!session) return res.status(404).json({ message: "Session not found" });

  // 1) save user message
  const userMsg = await ChatMessage.create({
    sessionId: session._id,
    role: "user",
    content: data.content
  });

  // 2) Smarter Placeholder assistant response
  let assistantText = "تم استلام سؤالك ✅ (الرد الذكي سيتم ربطه قريبًا). حاليا يمكنك استخدام قسم الإجراءات والنماذج من التطبيق.";

  // Quick check if the user is asking about a procedure (e.g., "كيف", "خطوات", "إجراءات")
  const contentLower = data.content.toLowerCase();
  if (contentLower.includes("كيف") || contentLower.includes("خطوات") || contentLower.includes("إجراءات") || contentLower.includes("procedure") || contentLower.includes("steps")) {
    // Try to find a matching procedure to be "helpful"
    const searchTerms = data.content.split(" ").filter(w => w.length > 3).slice(0, 3);
    if (searchTerms.length > 0) {
      const found = await Procedure.findOne({ 
        $text: { $search: searchTerms.join(" ") },
        isActive: true 
      }).select("name summary steps fees");

      if (found) {
        assistantText = `بناءً على سؤالك، قد يهمك معرفة إجراءات: **${found.name}**\n\n${found.summary || ""}\n\n`;
        if (found.steps && found.steps.length > 0) {
          assistantText += "**الخطوات الأساسية:**\n" + found.steps.map(s => `- ${s.title}`).join("\n") + "\n\n";
        }
        if (found.fees && found.fees.amountEgp) {
          assistantText += `**الرسوم التقريبية:** ${found.fees.amountEgp} جنيه مصري.`;
        }
        assistantText += "\n\nيمكنك العثور على التفاصيل الكاملة في قسم الإجراءات القانونية.";
      }
    }
  }

  const assistantMsg = await ChatMessage.create({
    sessionId: session._id,
    role: "assistant",
    content: assistantText
  });

  // update session title automatically if first user message
  if (session.title === "New Chat") {
    session.title = data.content.slice(0, 40);
  }
  await session.save();

  res.status(201).json({
    userMessage: userMsg,
    assistantMessage: assistantMsg
  });
});

// Archive session
export const archiveSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub, isDeleted: false },
    { status: "archived" },
    { new: true }
  );

  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json({ session });
});

// Soft delete session (and keep messages)
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json({ ok: true });
});
