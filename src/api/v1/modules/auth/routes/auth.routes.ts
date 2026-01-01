import { Router } from "express";
import {
  loginUser,
  oauthLogin,
  registerUser,
  requestMagicLink,
  verifyEmail,
  verifyMagicLink,
} from "../controller/auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import { registerSchema } from "@/schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", loginUser);
router.post("/oauth", oauthLogin);
router.post("/verify-email", verifyEmail);
router.post("/magic-link", requestMagicLink);
router.get("/magic-login", verifyMagicLink);

export default router;
