import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/utils/prismaClient";
import { env } from "@/config/env";
import { BadRequestError } from "@/types/errors";
import { OAuthProvider, OAuthService } from "../strategies/OAuthService";
import { randomBytes } from "crypto";
import { addMinutes } from "date-fns";
import { sendEmail } from "@/emails/sendEmail";

export async function registerUserService(
  name: string,
  email: string,
  password: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new BadRequestError("Email already registered");

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      isVerified: false,
      credentials: {
        create: {
          provider: "local",
          password: hashed,
        },
      },
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = addMinutes(new Date(), 30);

  await prisma.verificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const verificationLink = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your email to activate your TechNewsFeed account",
    templateName: "verify",
    variables: {
      name,
      appName: "TechNewsFeed",
      verifyLink: verificationLink,
    },
  });

  return {
    message:
      "Registration successful. Please check your email to verify your account.",
  };
}

export async function loginUserService(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { credentials: true },
  });

  if (!user) throw new BadRequestError("Invalid credentials");

  const localCredential = user.credentials.find(
    (cred) => cred.provider === "local"
  );

  if (!localCredential || !localCredential.password) {
    throw new BadRequestError("Please login using your OAuth provider");
  }

  const isValid = await bcrypt.compare(password, localCredential.password);
  if (!isValid) throw new BadRequestError("Invalid credentials");

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  return { user, token };
}

export async function oauthLoginService(
  provider: OAuthProvider,
  idToken: string
) {
  const verified = await OAuthService.verifyToken(provider, idToken);

  const { user, token } = await OAuthService.loginOrRegisterUser({
    provider: provider as OAuthProvider,
    email: verified.email as string,
    name: verified.name as string,
    avatarUrl: verified.avatarUrl as string,
    providerId: verified.providerId,
  });

  return { user, token };
}

export const verifyEmailService = async (token: string) => {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) throw new BadRequestError("Invalid or expired token");

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    throw new BadRequestError("Token expired. Please request a new one.");
  }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { isVerified: true },
  });

  await prisma.verificationToken.delete({ where: { token } });

  await sendEmail({
    to: user.email,
    subject: `Welcome to TechNewsFeed, ${user.name}!`,
    templateName: "welcome",
    variables: {
      name: user.name as string,
      appName: "TechNewsFeed",
      loginLink: `${process.env.APP_URL}/login`,
      logoUrl: "https://yourapp.com/logo.png",
    },
  });

  return { message: "Email verified successfully!" };
};
