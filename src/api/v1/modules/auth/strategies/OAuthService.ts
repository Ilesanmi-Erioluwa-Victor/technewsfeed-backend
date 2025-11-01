import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import prisma from "@/utils/prismaClient";
import { env } from "@/config/env";

export type OAuthProvider = "google" | "github" | "apple";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const OAuthService = {
  async verifyToken(provider: OAuthProvider, idToken: string) {
    switch (provider) {
      case "google":
        return await this.verifyGoogleToken(idToken);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  },

  async verifyGoogleToken(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID as string,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) throw new Error("Invalid Google token");

    return {
      email: payload.email,
      name: payload.name || "Google User",
      avatarUrl: payload.picture,
      providerId: payload.sub,
    };
  },

  async loginOrRegisterUser({
    provider,
    email,
    name,
    avatarUrl,
    providerId,
  }: {
    provider: OAuthProvider;
    email: string;
    name: string;
    avatarUrl?: string;
    providerId?: string;
  }) {
    const userInclude = {
      avatar: true,
      credentials: true,
    };

    let user = await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          isVerified: true,
          ...(avatarUrl && {
            avatar: {
              create: {
                url: avatarUrl,
                fileType: "image",
                size: null,
              },
            },
          }),
          credentials: {
            create: {
              provider: provider as string,
              providerId: providerId as string,
            },
          },
        },
        include: userInclude,
      });
    } else {
      const hasCredential = user.credentials.some(
        (cred) => cred.provider === provider
      );

      if (!hasCredential) {
        await prisma.authCredential.create({
          data: {
            provider: provider as string,
            providerId: providerId as string,
            userId: user.id,
          },
        });

        user = await prisma.user.findUnique({
          where: { email },
          include: userInclude,
        });
      }
    }

    if (!user) {
      throw new Error("Failed to create or find user");
    }
    if (!user.credentials || !("avatar" in user)) {
      throw new Error("User object is missing required relations");
    }

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return { user, token };
  },
};
