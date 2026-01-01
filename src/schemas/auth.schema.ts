import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name cannot exceed 100 characters" })
    .trim(),
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(3, { message: "Password must be at least 3 characters long" }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
  password: z.string().min(1, { message: "Password is required" }),
});

export const OAuthProviderEnum = z.enum(["google", "github", "facebook"]);

export const oauthLoginSchema = z.object({
  provider: OAuthProviderEnum.refine(
    (val) => ["google", "github", "facebook"].includes(val),
    { message: "Invalid OAuth provider" }
  ),
  idToken: z.string().min(1, { message: "ID token is required" }),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Verification token is required" }),
});

export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, { message: "Magic link token is required" }),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
});
