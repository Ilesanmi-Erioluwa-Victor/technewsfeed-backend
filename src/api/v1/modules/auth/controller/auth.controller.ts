// controller/auth.controller.ts
import { successResponse } from "@/types/errors";
import { Request, Response } from "express";
import {
  loginUserService,
  oauthLoginService,
  registerUserService,
} from "../service/auth.service";
import { OAuthService } from "../strategies/OAuthService";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const user = await registerUserService(name, email, password);
  return successResponse(res, user, "User registered successfully", 201);
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tokens = await loginUserService(email, password);
  return successResponse(
    res,
    {
      id: tokens.user.id,
      email: tokens.user.email,
      role: tokens.user.role,
      name: tokens.user.name,
      isVerified: tokens.user.isVerified,
      token: tokens.token,
    },
    "Login successful",
    200
  );
};

export const oauthLogin = async (req: Request, res: Response) => {
  const { provider, idToken } = req.body;
  const { user, token } = await oauthLoginService(provider, idToken);

  return successResponse(
    res,
    { user, token },
    `${provider} login successful`,
    200
  );
};
