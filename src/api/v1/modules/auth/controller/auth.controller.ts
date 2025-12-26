import { successResponse } from "@/types/errors";
import { Request, Response } from "express";
import {
  loginUserService,
  oauthLoginService,
  registerUserService,
  requestMagicLinkService,
  verifyEmailService,
  verifyMagicLinkService,
} from "../service/auth.service";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const user = await registerUserService(name, email, password);

  successResponse(res, user, "User registered successfully", 201);
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

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  const result = await verifyEmailService(token as string);
  return successResponse(res, result, "Account successfully verified", 200);
};

export const requestMagicLink = async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await requestMagicLinkService(email);
  return successResponse(res, result, "", 200);
};

export const verifyMagicLink = async (req: Request, res: Response) => {
  const { token } = req.query;
  const result = await verifyMagicLinkService(token as string);
  return successResponse(res, result, "Login successful", 200);
};
