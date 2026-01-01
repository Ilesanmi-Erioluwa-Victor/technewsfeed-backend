import { Router } from "express";
import {
  loginUser,
  oauthLogin,
  registerUser,
  requestMagicLink,
  resendVerification,
  verifyEmail,
  verifyMagicLink,
} from "../controller/auth.controller";
import { validate, validateQuery } from "@/middlewares/validate.middleware";
import {
  loginSchema,
  oauthLoginSchema,
  registerSchema,
  requestMagicLinkSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  verifyMagicLinkSchema,
} from "@/schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), registerUser);

router.post("/login", validate(loginSchema), loginUser);

router.post("/oauth", validate(oauthLoginSchema), oauthLogin);

router.post("/verify-email", validateQuery(verifyEmailSchema), verifyEmail);

router.post("/magic-link", validate(requestMagicLinkSchema), requestMagicLink);

router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerification
);

router.get(
  "/magic-login",
  validateQuery(verifyMagicLinkSchema),
  verifyMagicLink
);

export default router;
