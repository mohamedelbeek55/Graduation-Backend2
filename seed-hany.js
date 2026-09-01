import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Lawyer } from "./src/modules/lawyers/lawyer.model.js";

async function run() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    
    const email = "hany@example.com";
    const passwordHash = await bcrypt.hash("12345678", 10);
    
    let lawyer = await Lawyer.findOne({ email });
    if (lawyer) {
      console.log("Updating existing Hany Tarek...");
      lawyer.fullName = "Hany Tarek";
      lawyer.passwordHash = passwordHash;
      lawyer.isActive = true;
      lawyer.isVerified = true;
      lawyer.specialties = ["Civil", "Commercial", "Criminal"];
      await lawyer.save();
    } else {
      console.log("Creating Hany Tarek...");
      lawyer = await Lawyer.create({
        fullName: "Hany Tarek",
        email,
        passwordHash,
        phone: "01012345678",
        governorate: "Cairo",
        specialties: ["Civil", "Commercial", "Criminal"],
        pricePerSession: 500,
        isVerified: true,
        isActive: true
      });
    }
    
    console.log("✅ Success! Hany Tarek account ready:");
    console.log(`Email: ${email}`);
    console.log(`Password: 12345678`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
