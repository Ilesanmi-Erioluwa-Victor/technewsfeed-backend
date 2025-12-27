import { z } from "zod";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { BadRequestError } from "@/types/errors";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().url(),

  DIRECT_URL: z.string().url().optional(),

  PORT: z.string().default("3000"),

  FETCH_SECRET: z.string().optional(),

  EMAIL_APP_PASSWORD: z.string().optional(),

  HUGGING_FACE_TOKEN: z.string().optional(),

  APP_URL: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  GOOGLE_CLIENT_SECRET: z.string().optional(),

  GOOGLE_REDIRECT_URI: z.string().optional(),

  JWT_SECRET: z.string(),

  JWT_EXPIRES_IN: z.string().default("20d"),

  GOOGLE_REFRESH_TOKEN: z.string(),

  GMAIL_USER: z.string(),

  FRONTEND_URL: z.string(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.format());
  throw new BadRequestError(
    "Invalid environment variables. Please check your .env or Render dashboard settings."
  );
}

export const env = parsed.data;

if (env.NODE_ENV !== "production") {
  const envFilePath = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envFilePath)) {
    const envFileContent = fs.readFileSync(envFilePath, "utf-8");
    const envFileKeys = envFileContent
      .split("\n")
      .map((line) => line.split("=")[0]?.trim())
      .filter((key) => key && !key.startsWith("#"));

    const allowedKeys = Object.keys(envSchema.shape);
    for (const key of envFileKeys) {
      if (!allowedKeys.includes(key as string)) {
        throw new BadRequestError(
          `❌ Unknown environment variable in .env: ${key}`
        );
      }
    }
  }
}
