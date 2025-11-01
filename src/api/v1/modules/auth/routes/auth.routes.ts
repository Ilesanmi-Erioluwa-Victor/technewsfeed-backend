import { Router } from "express";
import {
  loginUser,
  oauthLogin,
  registerUser,
} from "../controller/auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/oauth", oauthLogin);

export default router;
