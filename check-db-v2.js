import "dotenv/config";
import mongoose from "mongoose";

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log("🔍 Starting test...");
  console.log("🔍 URI length:", uri?.length);

  try {
    console.log("⏳ Connecting...");
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000
    });
    
    console.log("✅ SUCCESS: Connected!");
    console.log("📊 State:", mongoose.connection.readyState);
    console.log("📂 DB Name:", mongoose.connection.name);
    
    await mongoose.disconnect();
    console.log("👋 Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err.name, "-", err.message);
    process.exit(1);
  }
}

testConnection();
