import "dotenv/config";
import mongoose from "mongoose";

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log("🔍 Testing URI...");

  try {
    // Set a 5-second timeout for the connection
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("✅ SUCCESS: Connected to MongoDB Atlas!");

    const dbName = mongoose.connection.name;
    console.log("📂 Database Name:", dbName);

    await mongoose.disconnect();
    console.log("👋 Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    process.exit(1);
  }
}

testConnection();
