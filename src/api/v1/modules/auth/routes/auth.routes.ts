import { Router } from "express";
import { loginUser, registerUser } from "../controller/auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
// router.post("/google", AuthController.googleAuth);

export default router;
