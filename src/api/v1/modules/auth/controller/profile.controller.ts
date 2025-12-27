import { Request, Response, NextFunction } from "express";
import {
  BadRequestError,
  successResponse,
  UnauthorizedError,
} from "@/types/errors";
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
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

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

    if (!email) {
      throw new BadRequestError("Email is required");
    }

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

    if (!email || !otp || !newPassword) {
      throw new BadRequestError("Email, OTP and new password are required");
    }

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

    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (!currentPassword || !newPassword) {
      throw new BadRequestError(
        "Current password and new password are required"
      );
    }

    const result = await changePassword(userId, currentPassword, newPassword);

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

    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (
      !purpose ||
      !["email_verification", "security", "transaction"].includes(purpose)
    ) {
      throw new BadRequestError(
        "Valid purpose is required: email_verification, security, or transaction"
      );
    }

    const result = await requestOTP(userId, purpose);

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

    if (!userId) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (!otp || !purpose) {
      throw new BadRequestError("OTP and purpose are required");
    }

    const result = await verifyOTP(userId, otp, purpose);

    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};
