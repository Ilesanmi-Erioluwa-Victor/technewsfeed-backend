import { Router } from "express";
import {
  loginUser,
  oauthLogin,
  registerUser,
  requestMagicLink,
  verifyEmail,
  verifyMagicLink,
} from "../controller/auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/oauth", oauthLogin);
router.post("/verify-email", verifyEmail);
router.post("/magic-link", requestMagicLink);
router.get("/magic-login", verifyMagicLink);

export default router;
