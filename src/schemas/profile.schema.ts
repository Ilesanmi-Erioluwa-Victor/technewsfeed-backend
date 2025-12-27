import { z } from "zod";

export const updateNameSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters long" })
      .max(100, { message: "Name cannot exceed 100 characters" })
      .trim(),
  })
  .superRefine((data, ctx) => {
    if (!data.name || data.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required",
        path: ["Name"],
      });
    }
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

export const PurposeEnum = z.enum([
  "email_verification",
  "security",
  "transaction",
]);

export const requestOTPSchema = z.object({
  purpose: PurposeEnum,
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
