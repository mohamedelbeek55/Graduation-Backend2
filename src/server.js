import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

// ✅ Vercel Serverless Handler
export default async function handler(req, res) {
  await ensureDB();
  return app(req, res);
}

// ✅ Local dev only
if (process.env.APP_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  await ensureDB();

  app.listen(PORT, () => {
    const env = process.env.APP_ENV || "development";
    const base = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;
    const frontend =
      process.env.PUBLIC_FRONTEND_URL ||
      (process.env.FRONTEND_ORIGINS || "").split(",")[0]?.trim() ||
      "https://lexaguide-frontend.vercel.app";
    console.log(`🚀 LexaGuide API (${env}) listening: ${base}`);
    console.log(frontend);
  });
}
