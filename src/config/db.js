import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in .env");

  mongoose.set("strictQuery", true);
  // Never log the full URI in production — it contains credentials
  if (process.env.APP_ENV !== "production") {
    console.log("URI used:", process.env.MONGODB_URI);
  }
  await mongoose.connect(uri);
  const isAtlas = /mongodb\.net/i.test(uri);
  console.log(isAtlas ? "✅ Atlas connected" : "✅ MongoDB connected");
}
