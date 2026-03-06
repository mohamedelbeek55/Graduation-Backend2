import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createGenerated,
  myGenerated,
  getGenerated,
  finalizeGenerated
} from "./generated.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createGenerated);
router.get("/my", myGenerated);
router.get("/:id", getGenerated);
router.patch("/:id/finalize", finalizeGenerated);

export default router;