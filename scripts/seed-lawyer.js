import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { Lawyer } from "../src/modules/lawyers/lawyer.model.js";

async function main() {
  await connectDB();

  const email = "demo.lawyer@lexaguide.com";
  const exists = await Lawyer.findOne({ email });
  if (exists) {
    exists.isVerified = true;
    exists.isActive = true;
    await exists.save();
    console.log("✅ Lawyer verified/activated:", exists.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("Admin12345", 10);
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
