import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { Lawyer } from "../src/modules/lawyers/lawyer.model.js";

async function main() {
  await connectDB();

  const email = "demo.lawyer@lexaguide.com";
  const password = "Admin12345";
  const passwordHash = await bcrypt.hash(password, 10);
  
  const exists = await Lawyer.findOne({ email });
  if (exists) {
    exists.passwordHash = passwordHash;
    exists.isVerified = true;
    exists.isActive = true;
    await exists.save();
    console.log("✅ Lawyer updated (password & status):", exists.email);
    process.exit(0);
  }

  const lawyer = await Lawyer.create({
    fullName: "Demo Lawyer",
    email,
    phone: "+201000000000",
    passwordHash,
    bio: "Commercial law specialist",
    governorate: "Cairo",
    address: "Downtown",
    specialties: ["Commercial Disputes"],
    pricePerSession: 50,
    isVerified: true,
    isActive: true
  });

  console.log("✅ Demo lawyer created:", lawyer.email);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
