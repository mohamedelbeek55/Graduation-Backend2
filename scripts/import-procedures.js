import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import csv from "csv-parser";
import { Procedure } from "../src/modules/procedures/procedure.model.js";

const CSV_PATH = "./data/egypt_procedures_full_dataset.csv";

const mapCategoryKey = (arabicCategory = "") => {
  const c = String(arabicCategory).trim();

  if (c.includes("أحوال")) return "civil";
  if (c.includes("بطاقة") || c.includes("رقم قومي") || c.includes("الرقم القومي")) return "id";
  if (c.includes("جواز")) return "passport";
  if (c.includes("شهر") || c.includes("توثيق") || c.includes("عقاري")) return "notary";
  if (c.includes("محاكم") || c.includes("قضايا") || c.includes("نيابة")) return "courts";

  return "other";
};

const parseNumberFromText = (val) => {
  // يحاول يطلع أول رقم من "45 - 50" أو "175 (فوري)" إلخ
  const s = String(val ?? "");
  const m = s.match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : 0;
};

const splitLines = (text) => {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Mongo connected");

  const rows = [];

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("error", (err) => {
      console.error("CSV read error:", err);
      process.exit(1);
    })
    .on("end", async () => {
      try {
        const docs = rows.map((row) => {
          const categoryAr = row.Category ? String(row.Category).trim() : "غير مصنف";
          const onlineText = String(row.Online_Availability ?? "");
          const online = onlineText.includes("نعم");

          const requiredDocs = splitLines(row.Required_Documents).map((docLine) => ({
            name: docLine.replace(/^\d+\.\s*/, "").trim(),
            notes: ""
          }));

          const steps = splitLines(row.Steps).map((stepLine, idx) => ({
            order: idx + 1,
            title: stepLine.replace(/^\d+\.\s*/, "").trim(),
            details: ""
          }));

          return {
            title: String(row.Procedure_Name ?? "").trim(),
            category: categoryAr,
            categoryKey: mapCategoryKey(categoryAr),
            summary: "",
            channels: { online, offline: true },
            requiredDocuments: requiredDocs,
            steps,
            fees: {
              amountEgp: parseNumberFromText(row.Fees_Estimated_EGP),
              notes: String(row.Fees_Estimated_EGP ?? "")
            },
            eta: {
              value: 0,
              unit: "days",
              notes: String(row.Expected_Time ?? "")
            },
            locations: [
              {
                governorate: "",
                address: String(row.Service_Location ?? ""),
                notes: ""
              }
            ],
            tags: [categoryAr],
            isActive: true
          };
        });

        // Clean then insert (seed behavior)
        await Procedure.deleteMany({});
        const inserted = await Procedure.insertMany(docs, { ordered: false });

        console.log("✅ Procedures Imported:", inserted.length);
        process.exit(0);
      } catch (err) {
        console.error("Import error:", err);
        process.exit(1);
      }
    });
}

main();