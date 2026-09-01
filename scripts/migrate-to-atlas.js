import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend folder
dotenv.config({ path: path.join(__dirname, "../.env") });

async function migrate() {
  const localUri = process.env.MONGODB_URI_LOCAL;
  const atlasUri = process.env.MONGODB_URI_ATLAS;

  if (!localUri || !atlasUri) {
    console.error("❌ Missing MONGODB_URI_LOCAL or MONGODB_URI_ATLAS in .env");
    process.exit(1);
  }

  console.log("🚀 Starting Migration from Local to Atlas...");

  try {
    // 1. Connect to Local
    const localConn = await mongoose.createConnection(localUri).asPromise();
    console.log("📡 Connected to Local MongoDB");

    // 2. Connect to Atlas
    const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
    console.log("📡 Connected to MongoDB Atlas");

    // 3. Get all collections from local
    const collections = await localConn.db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections to migrate`);

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith("system.")) continue; // Skip system collections

      console.log(`  ➡️ Migrating collection: ${colName}...`);

      const documents = await localConn.db.collection(colName).find({}).toArray();
      
      if (documents.length > 0) {
        // Clear Atlas collection first to avoid duplicates if re-running
        await atlasConn.db.collection(colName).deleteMany({});
        // Insert documents
        await atlasConn.db.collection(colName).insertMany(documents);
        console.log(`  ✅ Migrated ${documents.length} documents for ${colName}`);
      } else {
        console.log(`  ⚠️ Collection ${colName} is empty, skipping documents`);
      }
    }

    console.log("\n✨ Migration Completed Successfully!");
    
    await localConn.close();
    await atlasConn.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration Failed:", err.message);
    process.exit(1);
  }
}

migrate();
