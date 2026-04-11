import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./modules/auth/auth.routes.js";
import docsRoutes from "./modules/docs/docs.routes.js";
import proceduresRoutes from "./modules/procedures/procedures.routes.js";
import templatesRoutes from "./modules/templates/templates.routes.js";
import lawyersRoutes from "./modules/lawyers/lawyers.routes.js";
import consultationsRoutes from "./modules/consultations/consultations.routes.js";
import generatedRoutes from "./modules/generated/generated.routes.js";
import chatbotRoutes from "./modules/chatbot/chatbot.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

/* ===========================
   Security Middlewares
=========================== */

app.use(helmet());

app.use(cookieParser());

/* ===========================
   Smart CORS Configuration
=========================== */

const allowlist = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // ✅ Allow Postman & Mobile (no origin header)
      if (!origin) return callback(null, true);

      // ✅ Allow localhost in development
      if (process.env.APP_ENV !== "production") {
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (
        allowlist.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

/* ===========================
   Rate Limiter
=========================== */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200
});

app.use(limiter);

/* ===========================
   Body Parsers & Logger
=========================== */

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

/* ===========================
   Health Check
=========================== */

app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ ok: true, service: "LexaGuide API", database: dbStatus });
});

app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ ok: true, service: "LexaGuide API", database: dbStatus });
});

app.get("/api", (req, res) => {
  res.json({ ok: true, base: "/api", info: "LexaGuide API" });
});

/* ===========================
   Routes
=========================== */

app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/procedures", proceduresRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/lawyers", lawyersRoutes);
app.use("/api/consultations", consultationsRoutes);
app.use("/api/generated", generatedRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);

/* ===========================
   Error Handler (Always Last)
=========================== */

app.use(errorMiddleware);

export default app;
