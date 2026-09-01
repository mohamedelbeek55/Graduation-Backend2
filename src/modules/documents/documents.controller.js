import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import { asyncHandler } from "../../utils/asyncHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get full path to Data folder (robustly)
const getDataDir = () => {
    // Try multiple possible locations for Data folder
    const paths = [
        path.join(process.cwd(), "Data"),
        path.join(process.cwd(), "backend", "Data"),
        path.resolve(__dirname, "../../../Data"),
        path.resolve(__dirname, "../../Data")
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }

    console.error("❌ Data directory not found in any of:", paths);
    return paths[0]; // Fallback to first one
};

// Helper to get full path to CSV files
const getCsvPath = (type, templateName) => {
    const baseDir = getDataDir();
    let subDir = type.startsWith("complaint") ? "complaints" : "contracts";
    return path.join(baseDir, subDir, `${templateName}.csv`);
};

/**
 * GET /api/documents/templates
 * Scans the backend/Data folder and returns available templates.
 */
export const listTemplates = asyncHandler(async (req, res) => {
    const baseDir = getDataDir();
    const categories = ["contracts", "complaints"];
    const allTemplates = [];

    for (const category of categories) {
        const dirPath = path.join(baseDir, category);
        console.log(`🔍 Scanning directory: ${dirPath}`);

        if (!fs.existsSync(dirPath)) {
            console.warn(`⚠️ Directory not found: ${dirPath}`);
            continue;
        }

        const files = fs.readdirSync(dirPath);
        const templatesPromises = files
            .filter((file) => file.endsWith(".csv"))
            .map(async (file) => {
                const filename = file.replace(".csv", "");
                const filePath = path.join(dirPath, file);

                try {
                    const allRows = [];
                    await new Promise((resolve, reject) => {
                        const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
                            .pipe(csv())
                            .on("data", (data) => {
                                allRows.push(data);
                            })
                            .on("end", () => resolve())
                            .on("error", (error) => {
                                console.error(`❌ Error parsing ${file}:`, error.message);
                                reject(error);
                            });
                    });

                    const firstRow = allRows[0] || {};
                    const title = firstRow.Contract_Type || firstRow.Complaint_Type || filename;

                    // Collect all inputs and their explanations across all rows
                    const inputsMap = []; // Array of { name, explanation }
                    allRows.forEach(row => {
                        const requiredInputsStr = row.User_Input_Required || row.Required_Inputs || "";
                        const explanation = row.AI_Simple_Explanation || row.Simple_Explanation || "";

                        if (requiredInputsStr && requiredInputsStr !== "لا يوجد") {
                            // Split by comma, Arabic comma, dash, or semicolon
                            const inputNames = requiredInputsStr.split(/[،,\-;]/).map(s => s.trim()).filter(Boolean);
                            inputNames.forEach(name => {
                                // Add if not already present
                                const existing = inputsMap.find(i => i.name === name);
                                if (!existing) {
                                    inputsMap.push({ name, explanation });
                                } else if (!existing.explanation && explanation) {
                                    existing.explanation = explanation;
                                }
                            });
                        }
                    });

                    return {
                        id: filename,
                        title: title,
                        inputs: inputsMap, // Return array of objects now
                        category: category
                    };
                } catch (err) {
                    console.warn(`⚠️ Fallback for ${file}: ${err.message}`);
                    return {
                        id: filename,
                        title: filename,
                        inputs: "",
                        category: category
                    };
                }
            });

        const categoryTemplates = await Promise.all(templatesPromises);
        allTemplates.push(...categoryTemplates);
    }

    console.log(`✅ Found ${allTemplates.length} templates in total.`);
    res.json(allTemplates);
});

/**
 * Parse a CSV file and return its rows
 */
const parseCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (error) => reject(error));
    });
};

/**
 * GET /api/documents/templates/:type?name=templateName
 * Returns structured JSON of all clauses and their Required_Inputs
 */
export const getTemplate = asyncHandler(async (req, res) => {
    const { type } = req.params; // 'contract' or 'complaint'
    const { name } = req.query; // e.g., 'Standard contract'

    if (!name) {
        return res.status(400).json({ message: "Template name is required" });
    }

    try {
        const filePath = getCsvPath(type, name);
        const rows = await parseCsv(filePath);

        const structuredClauses = rows.map((row) => {
            // Map actual CSV columns to requested ones
            // Actual: File_Source, Contract_Type, Clause_Title, Original_Legal_Text, AI_Simple_Explanation, User_Input_Required
            const requiredInputsStr = row.User_Input_Required || row.Required_Inputs || "";
            const requiredInputs = (requiredInputsStr === "لا يوجد" || !requiredInputsStr)
                ? []
                : requiredInputsStr.split(/[،,-]/).map((s) => s.trim()).filter(Boolean);

            return {
                title: row.Clause_Title,
                originalText: row.Original_Legal_Text || row.Original_Text,
                simpleExplanation: row.AI_Simple_Explanation || row.Simple_Explanation,
                requiredInputs: requiredInputs,
            };
        });

        res.json({
            templateName: name,
            type,
            clauses: structuredClauses,
        });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

/**
 * POST /api/documents/generate
 * Takes templateId, category, and userValues (object with key-value pairs).
 * Returns the final concatenated legal text and explanation text.
 */
export const generateDocument = asyncHandler(async (req, res) => {
    const { templateId, category, userValues } = req.body;

    if (!templateId || !category || !userValues) {
        return res.status(400).json({ message: "templateId, category, and userValues are required" });
    }

    try {
        const baseDir = getDataDir();
        const filePath = path.join(baseDir, category, `${templateId}.csv`);
        const rows = await parseCsv(filePath);

        let fullText = "";
        let explanationText = "";
        let valueIndex = 0; // Initialize global index for array fallback

        rows.forEach((row) => {
            // Robust column matching (trim and case-insensitive)
            const getVal = (possibleNames) => {
                for (const name of possibleNames) {
                    const found = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
                    if (found) return row[found];
                }
                return "";
            };

            let clauseText = getVal(["Original_Legal_Text", "Original_Text", "Text"]);
            const clauseTitle = getVal(["Clause_Title", "Title"]);
            const clauseExplanation = getVal(["AI_Simple_Explanation", "Simple_Explanation", "Explanation"]);
            const requiredInputsStr = getVal(["User_Input_Required", "Required_Inputs", "Inputs"]);
            
            const requiredInputs = (requiredInputsStr === "لا يوجد" || !requiredInputsStr)
                ? []
                : requiredInputsStr.split(/[،,\-;]/).map((s) => s.trim()).filter(Boolean);

            if (!clauseText && !clauseTitle) return; // Skip empty rows

            // Clean up citations like [cite: ...] or [cite_start]
            clauseText = clauseText.replace(/\[cite_start\]/g, "")
                                   .replace(/\[cite: [^\]]+\]/g, "")
                                   .replace(/"/g, "") // Remove surrounding quotes if any
                                   .trim();

            // Replace placeholders (... or (...)) with user values based on requiredInputs mapping
            let currentClauseInputIdx = 0;
            const replaceFn = (match) => {
                const inputName = requiredInputs[currentClauseInputIdx];
                let val = ""; // Default to empty string instead of (...) to ensure "Real Contract" look

                if (userValues && typeof userValues === 'object' && inputName && userValues[inputName] !== undefined) {
                    val = `<span style="color: #000; font-weight: bold; border-bottom: 1px solid #000; padding: 0 4px;">${userValues[inputName]}</span>`;
                } else if (Array.isArray(userValues) && userValues[valueIndex] !== undefined) {
                    val = `<span style="color: #000; font-weight: bold; border-bottom: 1px solid #000; padding: 0 4px;">${userValues[valueIndex]}</span>`;
                } else {
                    // If no value, use a visible underline for manual filling later, or keep empty
                    val = `__________`;
                }
                
                currentClauseInputIdx++;
                valueIndex++;
                return val;
            };

            // Match both ... and (...) and variations like ( ... ) or even single . periods used as dots
            clauseText = clauseText.replace(/\(\s*\.\.\.\s*\)|\.\.\.|\(\.\.\.\)/g, replaceFn);

            if (clauseTitle) {
                fullText += `<div class="clause-item"><strong class="clause-title">${clauseTitle}</strong><p class="clause-body">${clauseText}</p></div>`;
                if (clauseExplanation) {
                    explanationText += `<div class="explanation-item"><strong>${clauseTitle}</strong><p>${clauseExplanation}</p></div>`;
                }
            } else {
                fullText += `<p class="clause-body">${clauseText}</p>`;
                if (clauseExplanation) {
                    explanationText += `<p>${clauseExplanation}</p>`;
                }
            }
        });

    res.json({
        fullText: fullText.trim(),
        explanationText: explanationText.trim()
    });
} catch (error) {
    res.status(404).json({ message: error.message });
}
});
