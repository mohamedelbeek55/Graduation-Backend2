import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import { uploadDoc, listMyDocs, getDoc } from "./docs.controller.js";

const router = Router();

router.post("/upload", requireAuth, upload.single("file"), uploadDoc);
router.get("/my", requireAuth, listMyDocs);
router.get("/:id", requireAuth, getDoc);

export default router;