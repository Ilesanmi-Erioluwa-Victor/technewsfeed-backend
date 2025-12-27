import { z } from "zod";

export const updateNameSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name cannot exceed 100 characters" })
    .trim()
    .refine((name) => name.length > 0, { message: "Name is required" }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      }),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const requestOTPSchema = z.object({
  purpose: z
    .enum(["email_verification", "security", "transaction"])
    .refine(
      (val) => ["email_verification", "security", "transaction"].includes(val),
      {
        message:
          "Purpose must be one of: email_verification, security, transaction",
      }
    ),
});

export const verifyOTPSchema = z.object({
  otp: z
    .string()
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  purpose: z.string().min(1, { message: "Purpose is required" }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
  otp: z
    .string()
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  newPassword: z
    .string()
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    }),
});
