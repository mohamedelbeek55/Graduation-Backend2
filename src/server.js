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
    console.log(`🚀 LexaGuide API running on http://localhost:${PORT}`);
  });
}