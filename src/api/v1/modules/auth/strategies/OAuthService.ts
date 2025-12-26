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
    // Only include avatar in the response
    const userInclude = {
      avatar: true,
    };
  
    let user = await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
  
    if (!user) {
      // Create new user
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
      // Check credential separately without including in response
      const existingCredential = await prisma.authCredential.findFirst({
        where: {
          userId: user.id,
          provider: provider as string,
        },
      });
  
      if (!existingCredential) {
        await prisma.authCredential.create({
          data: {
            provider: provider as string,
            providerId: providerId as string,
            userId: user.id,
          },
        });
      }
    }
  
    if (!user) {
      throw new Error("Failed to create or find user");
    }
  
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  
    return { user, token };
  }
}