import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/modules/users/user.model.js";

async function main() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  let user = await User.findOne({ email });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      fullName,
      email,
      passwordHash,
      role: "admin",
      isActive: true
    });
    console.log("✅ Admin created:", user.email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.role = "admin";
    user.isActive = true;
    await user.save();
    console.log("✅ Admin updated (password & role):", user.email);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});