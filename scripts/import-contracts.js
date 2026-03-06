import "dotenv/config";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { connectDB } from "../src/config/db.js";
import { ContractTemplate } from "../src/modules/templates/contractTemplate.model.js";

function splitInputs(v) {
  if (!v) return [];
  return String(v)
    .split(/[,;\n|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main() {
  const dir = path.resolve("Data/contracts");
  if (!fs.existsSync(dir)) {
    console.error("❌ Missing folder:", dir);
    process.exit(1);
  }

  await connectDB();

  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".csv"));
  let totalTemplates = 0;

  for (const file of files) {
    const fp = path.join(dir, file);
    const rows = await readCsv(fp);
    if (!rows.length) continue;

    // columns (from your dataset):
    // Contract_Type, Clause_Title, Original_Text, Simple_Explanation, Required_Inputs
    const templateType = rows[0].Contract_Type || path.parse(file).name;
    const title = templateType;

    const clauses = rows
      .filter((r) => r.Clause_Title && r.Original_Text)
      .map((r) => ({
        clauseTitle: r.Clause_Title,
        originalText: r.Original_Text,
        explanation: r.Simple_Explanation || "",
        userInputs: splitInputs(r.Required_Inputs)
      }));

    const tags = [templateType].filter(Boolean);

    await ContractTemplate.findOneAndUpdate(
      { sourceFile: file, type: templateType },
      { title, type: templateType, sourceFile: file, clauses, tags, isActive: true },
      { upsert: true, new: true }
    );

    totalTemplates += 1;
    console.log("✅ Imported contract template:", file, "clauses:", clauses.length);
  }

  console.log("🎉 Done. Templates:", totalTemplates);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});