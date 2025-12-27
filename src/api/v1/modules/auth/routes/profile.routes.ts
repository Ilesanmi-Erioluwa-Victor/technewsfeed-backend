import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middlewares";
import { validate } from "@/middlewares/validate.middleware";
import {
  updateNameSchema,
  changePasswordSchema,
  requestOTPSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/schemas/profile.schema";
import {
  forgotPassword,
  requestNewOTP,
  resetPassword,
  updateName,
  updatePassword,
  verifyNewOTP,
} from "../controller/profile.controller";

const router = Router();
router.use(authenticate);

router.patch("/name", validate(updateNameSchema), updateName);

router.put("/password", validate(changePasswordSchema), updatePassword);

router.post("/otp/request", validate(requestOTPSchema), requestNewOTP);

router.post("/otp/verify", validate(verifyOTPSchema), verifyNewOTP);

// ========== PUBLIC ROUTES ==========
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
