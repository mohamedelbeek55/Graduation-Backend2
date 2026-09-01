import "dotenv/config";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/modules/users/user.model.js";
import { Lawyer } from "../src/modules/lawyers/lawyer.model.js";

async function main() {
  await connectDB();
  const email = "demo.lawyer@lexaguide.com";
  
  const user = await User.findOne({ email });
  const lawyer = await Lawyer.findOne({ email });
  
  console.log("User found:", !!user);
  console.log("Lawyer found:", !!lawyer);
  
  if (user) {
    console.log("User role:", user.role);
    console.log("User isActive:", user.isActive);
  }
  
  process.exit(0);
}

main().catch(console.error);
