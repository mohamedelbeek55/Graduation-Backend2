import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/modules/users/user.model.js";
import { Lawyer } from "../src/modules/lawyers/lawyer.model.js";

// ⚠️ Fake demo data only — no real personal info (no real national IDs,
// no real phone numbers, no real emails). Safe to publish in a README.

const DEMO_ACCOUNTS = {
  admin: {
    fullName: "Demo Admin",
    email: "admin.demo@lexaguide.com",
    password: "DemoAdmin#2025",
    role: "admin"
  },
  user: {
    fullName: "Demo User",
    email: "user.demo@lexaguide.com",
    password: "DemoUser#7391",
    role: "user"
  },
  lawyer: {
    fullName: "Demo Lawyer",
    email: "lawyer.demo@lexaguide.com",
    password: "DemoLawyer#4820",
    phone: "+201000000000",
    bio: "Commercial law specialist (demo account for testing)",
    governorate: "Cairo",
    address: "Downtown",
    specialties: ["Commercial Disputes"],
    pricePerSession: 50
  }
};

async function upsertUser({ fullName, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email });

  if (user) {
    user.passwordHash = passwordHash;
    user.role = role;
    user.isActive = true;
    await user.save();
    console.log(`✅ ${role} updated:`, user.email);
  } else {
    user = await User.create({ fullName, email, passwordHash, role, isActive: true });
    console.log(`✅ ${role} created:`, user.email);
  }
}

async function upsertLawyer({ fullName, email, password, phone, bio, governorate, address, specialties, pricePerSession }) {
  const passwordHash = await bcrypt.hash(password, 10);
  let lawyer = await Lawyer.findOne({ email });

  if (lawyer) {
    lawyer.passwordHash = passwordHash;
    lawyer.isVerified = true;
    lawyer.isActive = true;
    await lawyer.save();
    console.log("✅ lawyer updated:", lawyer.email);
  } else {
    lawyer = await Lawyer.create({
      fullName,
      email,
      phone,
      passwordHash,
      bio,
      governorate,
      address,
      specialties,
      pricePerSession,
      isVerified: true,
      isActive: true
    });
    console.log("✅ lawyer created:", lawyer.email);
  }
}

async function main() {
  await connectDB();

  await upsertUser(DEMO_ACCOUNTS.admin);
  await upsertUser(DEMO_ACCOUNTS.user);
  await upsertLawyer(DEMO_ACCOUNTS.lawyer);

  console.log("\n📋 Demo accounts ready:");
  console.table([
    { role: "admin", email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password },
    { role: "user", email: DEMO_ACCOUNTS.user.email, password: DEMO_ACCOUNTS.user.password },
    { role: "lawyer", email: DEMO_ACCOUNTS.lawyer.email, password: DEMO_ACCOUNTS.lawyer.password }
  ]);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
