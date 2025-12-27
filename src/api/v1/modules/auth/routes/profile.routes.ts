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

// ========= PUBLIC =========
router.post("/password/forgot", validate(forgotPasswordSchema), forgotPassword);
router.post("/password/reset", validate(resetPasswordSchema), resetPassword);

router.use(authenticate);

router.patch("/", validate(updateNameSchema), updateName);
router.patch("/password", validate(changePasswordSchema), updatePassword);

router.post("/otp/request", validate(requestOTPSchema), requestNewOTP);
router.post("/otp/verify", validate(verifyOTPSchema), verifyNewOTP);

export default router;
