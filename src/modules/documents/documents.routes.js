import express from "express";
import { getTemplate, generateDocument, listTemplates } from "./documents.controller.js";

const router = express.Router();

// GET /api/documents/templates
router.get("/templates", listTemplates);

// GET /api/documents/templates/:type?name=templateName
router.get("/templates/:type", getTemplate);

// POST /api/documents/generate
router.post("/generate", generateDocument);

export default router;
