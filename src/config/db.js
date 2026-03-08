import "dotenv/config";
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in .env");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  const isAtlas = /mongodb\.net/i.test(uri);
  console.log(isAtlas ? "✅ Atlas connected" : "✅ MongoDB connected");
}
