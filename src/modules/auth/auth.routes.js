import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  forgotPassword,
  resetPassword,
  me
} from "./auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/logout-all", requireAuth, logoutAll);
router.patch("/password", requireAuth, changePassword);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", requireAuth, me);

export default router;