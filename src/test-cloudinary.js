import dotenv from "dotenv";
dotenv.config();

console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);

import { cloudinary } from "./config/cloudinary.js";

async function run() {
  try {
    const res = await cloudinary.api.ping();
    console.log(res);
  } catch (err) {
    console.log("ERROR:", err);
  }
}

run();