import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/utils/prismaClient";
import { env } from "@/config/env";
import { BadRequestError } from "@/types/errors";
import { OAuthProvider, OAuthService } from "../strategies/OAuthService";

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
      isVerified: true,
      credentials: {
        create: {
          provider: "local",
          password: hashed,
        },
      },
    },
    include: { credentials: true },
  });

  return { id: user.id, name: user.name, email: user.email };
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
