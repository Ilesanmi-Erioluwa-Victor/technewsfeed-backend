import { successResponse } from "@/types/errors";
import { Request, Response } from "express";
import { loginUserService, registerUserService } from "../service/auth.service";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const user = await registerUserService(name, email, password);
  return successResponse(res, user, "user registered successfully", 201);
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tokens = await loginUserService(email, password);
  return successResponse(res, tokens, "login successful", 200);
};
