import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/utils/prismaClient";
import { sendEmail } from "@/emails/sendEmail";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "@/types/errors";

// ========== AUDIT LOG HELPER ==========
export const createAuditLog = async (data: {
  userId: string;
  action: string;
  category: string;
  entity?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        actorId: data.userId,
        targetId: data.entityId as string,
        targetType: data.entity as string,
        description: data.description as string,
        payload: {
          oldValue: data.oldValue,
          newValue: data.newValue,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

// ========== UPDATE USER NAME ==========
export const updateUserName = async (userId: string, newName: string) => {
  if (!newName || newName.trim().length < 2) {
    throw new BadRequestError("Name must be at least 2 characters long");
  }

  const trimmedName = newName.trim();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const oldName = user.name;

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
    action: "NAME_CHANGE",
    category: "PROFILE",
    entity: "User",
    entityId: userId,
    oldValue: { name: oldName },
    newValue: { name: trimmedName },
    description: "User changed their display name",
  });

  return updatedUser;
};

// ========== VERIFY PASSWORD STRENGTH ==========
export const validatePasswordStrength = (password: string): boolean => {
  if (password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters long");
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestError(
      "Password must contain at least one uppercase letter"
    );
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new BadRequestError(
      "Password must contain at least one lowercase letter"
    );
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    throw new BadRequestError("Password must contain at least one number");
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    throw new BadRequestError(
      "Password must contain at least one special character"
    );
  }

  return true;
};

// ========== GET USER WITH LOCAL CREDENTIALS ==========
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

// ========== FORGOT PASSWORD ==========
export const requestPasswordReset = async (email: string) => {
  const user = await getUserWithLocalCredentials(email);

  if (!user) {
    // Security: Don't reveal if user exists
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

  // Delete any existing unused reset tokens
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      used: false,
    },
  });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Create reset token (expires in 15 minutes)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      otp,
      userId: user.id,
      expiresAt,
    },
  });

  // Send email
  await sendEmail({
    to: email,
    subject: "Reset Your Password - TechNewsFeed",
    templateName: "password-reset",
    variables: {
      name: user.name || "User",
      otp,
      appName: "TechNewsFeed",
      expiresIn: "15 minutes",
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUEST",
    category: "SECURITY",
    entity: "User",
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

// ========== RESET PASSWORD WITH OTP ==========
export const resetPasswordWithOTP = async (
  email: string,
  otp: string,
  newPassword: string
) => {
  validatePasswordStrength(newPassword);

  const user = await getUserWithLocalCredentials(email);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    throw new UnauthorizedError("Invalid or expired OTP");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password in transaction
  await prisma.$transaction(async (tx) => {
    // Update password
    await tx.authCredential.updateMany({
      where: {
        userId: user.id,
        provider: "local",
      },
      data: {
        password: hashedPassword,
      },
    });

    // Mark OTP as used
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });
  });

  await createAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_COMPLETE",
    category: "SECURITY",
    entity: "User",
    entityId: user.id,
    description: "User reset password using OTP",
  });

  return {
    success: true,
    message:
      "Password has been reset successfully. You can now login with your new password.",
  };
};

// ========== CHANGE PASSWORD (LOGGED IN USER) ==========
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

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const localCredential = user.credentials.find((c) => c.provider === "local");

  if (!localCredential || !localCredential.password) {
    throw new BadRequestError("This account does not have a password set");
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    localCredential.password
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  // Check if new password is same as old password
  const isSamePassword = await bcrypt.compare(
    newPassword,
    localCredential.password
  );

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password"
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.authCredential.updateMany({
    where: {
      userId: user.id,
      provider: "local",
    },
    data: {
      password: hashedPassword,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    category: "SECURITY",
    entity: "User",
    entityId: user.id,
    description: "User changed their password",
  });

  return {
    success: true,
    message: "Password changed successfully",
  };
};

// ========== GENERATE OTP ==========
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== CHECK OTP RATE LIMIT ==========
export const checkOTPRateLimit = async (userId: string): Promise<void> => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentRequests = await prisma.auditLog.count({
    where: {
      actorId: userId,
      action: "OTP_REQUEST",
      createdAt: { gte: oneMinuteAgo },
    },
  });

  if (recentRequests >= 3) {
    throw new TooManyRequestsError(
      "Too many OTP requests. Please wait before trying again."
    );
  }
};

// ========== REQUEST OTP (GENERAL PURPOSE) ==========
export const requestOTP = async (
  userId: string,
  purpose: "email_verification" | "security" | "transaction"
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check rate limit
  await checkOTPRateLimit(userId);

  // Generate OTP
  const otp = generateOTP();

  // Create OTP record (expires in 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      token: otp,
      userId,
      expiresAt,
    },
  });

  // Send email based on purpose
  let emailSubject = "";
  let emailTemplate = "";

  switch (purpose) {
    case "email_verification":
      emailSubject = "Verify Your Email - TechNewsFeed";
      emailTemplate = "verify-email";
      break;
    case "security":
      emailSubject = "Security Verification - TechNewsFeed";
      emailTemplate = "security-otp";
      break;
    case "transaction":
      emailSubject = "Transaction Verification - TechNewsFeed";
      emailTemplate = "transaction-otp";
      break;
    default:
      emailSubject = "Verification Code - TechNewsFeed";
      emailTemplate = "generic-otp";
  }

  await sendEmail({
    to: user.email,
    subject: emailSubject,
    templateName: emailTemplate,
    variables: {
      name: user.name || "User",
      otp,
      appName: "TechNewsFeed",
      purpose: purpose.replace("_", " "),
      expiresIn: "10 minutes",
    },
  });

  await createAuditLog({
    userId,
    action: "OTP_REQUEST",
    category: "SECURITY",
    entity: "User",
    entityId: userId,
    description: `User requested OTP for ${purpose}`,
  });

  return {
    success: true,
    message: "OTP sent to your email",
    // Development only - remove in production
    ...(process.env.NODE_ENV === "development" && { otp }),
  };
};

// ========== VERIFY OTP ==========
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

  // Delete the used OTP
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id },
  });

  await createAuditLog({
    userId,
    action: "OTP_VERIFY",
    category: "SECURITY",
    entity: "User",
    entityId: userId,
    description: `User verified OTP for ${purpose}`,
  });

  return {
    success: true,
    message: "OTP verified successfully",
    verified: true,
  };
};
