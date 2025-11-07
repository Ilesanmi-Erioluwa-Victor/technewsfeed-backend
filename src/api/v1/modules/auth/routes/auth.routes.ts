import { Router } from "express";
import {
  loginUser,
  oauthLogin,
  registerUser,
  verifyEmail,
} from "../controller/auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/oauth", oauthLogin);
router.post("/verify-email", verifyEmail);

export default router;
