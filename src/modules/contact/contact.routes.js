import { Router } from "express";
import { submitContactForm, listContacts } from "./contact.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/", submitContactForm);
router.get("/", requireAuth, requireRole("admin"), listContacts);

export default router;
