import { Request, Response, NextFunction } from "express";
import { successResponse } from "@/types/errors";
import {
  changePassword,
  requestOTP,
  requestPasswordReset,
  resetPasswordWithOTP,
  updateUserName,
  verifyOTP,
} from "../service/profile.service";

export const updateName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    const updatedUser = await updateUserName(userId, name);

    return successResponse(
      res,
      { user: updatedUser },
      "Name updated successfully",
      200
    );
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const result = await requestPasswordReset(email);

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp, newPassword } = req.body;

    const result = await resetPasswordWithOTP(email, otp, newPassword);

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    const result = await changePassword(
      userId as string,
      currentPassword,
      newPassword
    );

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const requestNewOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { purpose } = req.body;

    const result = await requestOTP(userId as string, purpose);

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const verifyNewOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { otp, purpose } = req.body;

    const result = await verifyOTP(userId as string, otp, purpose);

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};
