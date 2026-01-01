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

// Login Schema
export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
  password: z.string().min(1, { message: "Password is required" }),
});

// OAuth Provider Enum
export const OAuthProviderEnum = z.enum(["google", "github", "facebook"], {
  errorMap: () => ({ message: "Invalid OAuth provider" }),
});

// OAuth Login Schema
export const oauthLoginSchema = z.object({
  provider: OAuthProviderEnum,
  idToken: z.string().min(1, { message: "ID token is required" }),
});

// Verify Email Schema (for query parameters)
export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Verification token is required" }),
});

// Magic Link Request Schema
export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
});

// Magic Link Verification Schema (for query parameters)
export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, { message: "Magic link token is required" }),
});

// Resend Verification Email Schema
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email({ message: "Valid email is required" })
    .min(1, { message: "Email is required" })
    .toLowerCase()
    .trim(),
});
