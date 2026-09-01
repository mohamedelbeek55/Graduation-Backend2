import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { Lawyer } from "../src/modules/lawyers/lawyer.model.js";

async function main() {
  await connectDB();
  const email = "demo.lawyer@lexaguide.com";
  const password = "Admin12345";
  
  const lawyer = await Lawyer.findOne({ email });
  if (!lawyer) {
    console.log("❌ Lawyer not found");
    process.exit(1);
  }

  const ok = await bcrypt.compare(password, lawyer.passwordHash);
  console.log("Password comparison result:", ok);
  console.log("Is Active:", lawyer.isActive);
  console.log("Is Verified:", lawyer.isVerified);
  
  if (!ok) {
    console.log("Attempting to re-hash and save...");
    const newHash = await bcrypt.hash(password, 10);
    lawyer.passwordHash = newHash;
    await lawyer.save();
    console.log("✅ Re-hashed and saved.");
    
    const verifyOk = await bcrypt.compare(password, lawyer.passwordHash);
    console.log("Verification after re-hash:", verifyOk);
  }

  process.exit(0);
}

main().catch(console.error);
