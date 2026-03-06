import z from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ChatSession } from "./chatSession.model.js";
import { ChatMessage } from "./chatMessage.model.js";

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

// Send message (User) + placeholder assistant response
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

  // 2) (placeholder) assistant response - AI team will replace this later
  const assistantText =
    "تم استلام سؤالك ✅ (الرد الذكي سيتم ربطه قريبًا). حاليا يمكنك استخدام قسم الإجراءات والنماذج من التطبيق.";

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