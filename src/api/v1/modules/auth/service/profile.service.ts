import bcrypt from "bcryptjs";
import geoip from "geoip-lite";
import useragent from "useragent";
import { Request } from "express";

import prisma from "@/utils/prismaClient";
import { sendEmail } from "@/emails/sendEmail";
import {
  BadRequestError,
  UnauthorizedError,
  TooManyRequestsError,
} from "@/types/errors";
import { createAuditLog } from "@/utils/createAuditLog";
import { generateOTP } from "@/utils/generateOtp";
import { maskIP } from "@/utils/maskIp";
import { EMAIL_TEMPLATES, getTemplateForPurpose } from "@/emails/types/email";
import { AuditAction, AuditEntity } from "@/types/audit.types";
import { AuditCategoryEnum } from "@/generated/prisma";

export const updateUserName = async (userId: string, newName: string) => {
  const trimmedName = newName.trim();
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const oldName = user?.name;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: trimmedName,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      isVerified: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    userId,
    action: AuditAction.NAME_CHANGE,
    categoryName: AuditCategoryEnum.PROFILE,
    entity: AuditEntity.USER,
    entityId: userId,
    oldValue: { name: oldName },
    newValue: { name: trimmedName },
    description: "User changed their display name",
  });

  return updatedUser;
};

export const validatePasswordStrength = (password: string): boolean => {
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestError(
      "Password must contain at least one uppercase letter"
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new BadRequestError(
      "Password must contain at least one lowercase letter"
    );
  }

  return true;
};

export const getUserWithLocalCredentials = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      credentials: {
        where: { provider: "local" },
      },
    },
  });

  return user;
};

export const requestPasswordReset = async (email: string, req?: Request) => {
  const user = await getUserWithLocalCredentials(email);

  if (!user) {
    return {
      success: true,
      message: "If an account exists, you will receive a password reset email",
    };
  }

  const hasLocalCredential = user.credentials.some(
    (c) => c.provider === "local"
  );
  if (!hasLocalCredential) {
    throw new BadRequestError(
      "This account uses social login. Please sign in with your social provider."
    );
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      used: false,
    },
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      otp,
      userId: user.id,
      expiresAt,
    },
  });

  const userAgent = req?.headers["user-agent"] || "Unknown";
  const agent = useragent.parse(userAgent);
  const deviceInfo = `${agent.os.toString()} • ${agent.device.toString()}`;

  await sendEmail({
    to: email,
    subject: "Reset Your Password - TechNewsFeed",
    templateName: EMAIL_TEMPLATES.FORGOT_PASSWORD,
    variables: {
      name: user.name || "User",
      otp,
      appName: "TechNewsFeed",
      expiresIn: "15 minutes",
      deviceInfo,
      timestamp: new Date().toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        year: "numeric",
      }),
      resetLink: `${process.env.APP_URL}/reset-password`,
      websiteUrl: process.env.APP_URL || "https://technewsfeed.com",
    },
  });

  await createAuditLog({
    userId: user.id,
    action: AuditAction.PASSWORD_RESET_REQUEST,
    categoryName: AuditCategoryEnum.SECURITY,
    entity: AuditEntity.USER,
    entityId: user.id,
    description: "User requested password reset",
  });

  return {
    success: true,
    message: "Password reset OTP sent to your email",
    // Development only - remove in production
    ...(process.env.NODE_ENV === "development" && { otp }),
  };
};

export const resetPasswordWithOTP = async (
  email: string,
  otp: string,
  newPassword: string,
  req?: Request
) => {
  validatePasswordStrength(newPassword);
  const user = await getUserWithLocalCredentials(email);

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user?.id as string,
      otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    throw new UnauthorizedError("Invalid or expired OTP");
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.authCredential.updateMany({
      where: {
        userId: user?.id as string,
        provider: "local",
      },
      data: {
        password: hashedPassword,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });
  });

  await createAuditLog({
    userId: user?.id as string,
    action: AuditAction.PASSWORD_RESET_COMPLETE,
    categoryName: AuditCategoryEnum.SECURITY,
    entity: AuditEntity.USER,
    entityId: user?.id as string,
    description: "User reset password using OTP",
  });

  const ipAddress = req?.ip || req?.socket?.remoteAddress || "Unknown";
  const userAgent = req?.headers["user-agent"] || "Unknown";
  const agent = useragent.parse(userAgent);

  let location = "Unknown Location";
  if (ipAddress && ipAddress !== "Unknown") {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = `${geo.city || ""}${geo.city && geo.country ? ", " : ""}${
        geo.country || ""
      }`;
    }
  }
  const deviceInfo = `${agent.os.toString()} • ${agent.device.toString()}`;

  await sendEmail({
    to: email,
    subject: "Password Updated Successfully - TechNewsFeed",
    templateName: EMAIL_TEMPLATES.PASSWORD_RESET_CONFIRMATION,
    variables: {
      name: user?.name || "User",
      appName: "TechNewsFeed",
      timestamp: new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
      deviceInfo,
      location,
      ipAddress: ipAddress === "Unknown" ? "Unknown" : maskIP(ipAddress),
      loginLink: `${process.env.APP_URL}/login`,
      websiteUrl: process.env.APP_URL || "https://technewsfeed.com",
    },
  });

  return {
    success: true,
    message:
      "Password has been reset successfully. You can now login with your new password.",
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  validatePasswordStrength(newPassword);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      credentials: {
        where: { provider: "local" },
      },
    },
  });

  const localCredential = user?.credentials.find((c) => c.provider === "local");
  if (!localCredential || !localCredential.password) {
    throw new BadRequestError("This account does not have a password set");
  }

  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    localCredential.password
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const isSamePassword = await bcrypt.compare(
    newPassword,
    localCredential.password
  );

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password"
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.authCredential.updateMany({
    where: {
      userId: user?.id as string,
      provider: "local",
    },
    data: {
      password: hashedPassword,
    },
  });

  await createAuditLog({
    userId: user?.id as string,
    action: AuditAction.PASSWORD_CHANGE,
    categoryName: AuditCategoryEnum.SECURITY,
    entity: AuditEntity.USER,
    entityId: user?.id as string,
    description: "User changed their password",
  });

  return {
    success: true,
    message: "Password changed successfully",
  };
};

export const checkOTPRateLimit = async (userId: string): Promise<void> => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentRequests = await prisma.auditLog.count({
    where: {
      actorId: userId,
      action: "OTP_REQUEST",
      createdAt: { gte: oneMinuteAgo },
    },
  });

  if (recentRequests >= 5) {
    throw new TooManyRequestsError(
      "Too many OTP requests. Please wait before trying again."
    );
  }
};

export const requestOTP = async (
  userId: string,
  purpose: "email_verification" | "security" | "transaction"
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  await checkOTPRateLimit(userId);
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      token: otp,
      userId,
      expiresAt,
    },
  });

  const emailSubjects = {
    email_verification: "Verify Your Email - TechNewsFeed",
    security: "Security Verification - TechNewsFeed",
    transaction: "Transaction Verification - TechNewsFeed",
  };

  const emailTemplate = getTemplateForPurpose(purpose);
  const emailSubject =
    emailSubjects[purpose] || "Verification Code - TechNewsFeed";

  await sendEmail({
    to: user?.email as string,
    subject: emailSubject,
    templateName: emailTemplate,
    variables: {
      name: user?.name || "User",
      otp,
      appName: "TechNewsFeed",
      purpose: purpose.replace("_", " "),
      expiresIn: "10 minutes",
      websiteUrl: process.env.APP_URL || "https://technewsfeed.com",
    },
  });

  await createAuditLog({
    userId,
    action: AuditAction.OTP_REQUEST,
    categoryName: AuditCategoryEnum.SECURITY,
    entity: AuditEntity.USER,
    entityId: userId,
    description: `User requested OTP for ${purpose}`,
  });

  return {
    success: true,
    message: "OTP sent to your email",
    ...(process.env.NODE_ENV === "development" && { otp }),
  };
};

export const verifyOTP = async (
  userId: string,
  otp: string,
  purpose: string
) => {
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      userId,
      token: otp,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verificationToken) {
    throw new UnauthorizedError("Invalid or expired OTP");
  }
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id },
  });

  await createAuditLog({
    userId,
    action: AuditAction.OTP_VERIFY,
    categoryName: AuditCategoryEnum.SECURITY,
    entity: AuditEntity.USER,
    entityId: userId,
    description: `User verified OTP for ${purpose}`,
  });

  return {
    success: true,
    message: "OTP verified successfully",
    verified: true,
  };
};
