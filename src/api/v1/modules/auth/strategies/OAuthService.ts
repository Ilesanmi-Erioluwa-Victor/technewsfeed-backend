import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import jwt from "jsonwebtoken";
import prisma from "@/utils/prismaClient";
import { env } from "@/config/env";
import {
  BadRequestError,
  InternalServerError,
  UnauthorizedError,
} from "@/types/errors";

export type OAuthProvider = "google" | "github" | "apple";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const OAuthService = {
  async verifyToken(provider: OAuthProvider, idToken: string) {
    switch (provider) {
      case "google":
        return await this.verifyGoogleToken(idToken);
      case "github":
        return await this.verifyGitHubToken(idToken);
      // case "apple":
      //   return await this.verifyAppleToken(idToken);
      default:
        throw new BadRequestError(`Unsupported provider: ${provider}`);
    }
  },

  async verifyGoogleToken(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID as string,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) throw new UnauthorizedError("Invalid Google token");

    return {
      email: payload.email,
      name: payload.name || "Google User",
      avatarUrl: payload.picture,
      providerId: payload.sub,
    };
  },

  async verifyGitHubToken(accessToken: string) {
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const userData = response.data;
      let email = userData.email;
      if (!email) {
        const emailResponse = await axios.get(
          "https://api.github.com/user/emails",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const emails = emailResponse.data;
        const primaryEmail = emails.find((e: any) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }

      if (!email) {
        throw new UnauthorizedError(
          "GitHub account doesn't have a public email"
        );
      }

      return {
        email,
        name: userData.name || userData.login || "GitHub User",
        avatarUrl: userData.avatar_url,
        providerId: userData.id.toString(),
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedError("Invalid GitHub access token");
      }
      throw new UnauthorizedError("Failed to verify GitHub token");
    }
  },

  // async verifyAppleToken(idToken: string) {
  //   try {
  //     const decoded = this.decodeJWT(idToken);

  //     if (!decoded.email) {
  //       throw new UnauthorizedError("Apple token doesn't contain email");
  //     }

  //     return {
  //       email: decoded.email,
  //       name: decoded.name || "Apple User",
  //       avatarUrl: undefined,
  //       providerId: decoded.sub,
  //     };
  //   } catch (error) {
  //     throw new UnauthorizedError("Invalid Apple token");
  //   }
  // },

  // decodeJWT(token: string): any {
  //   const parts = token.split(".");
  //   if (parts.length !== 3) {
  //     throw new Error("Invalid JWT format");
  //   }
  //   const payload = parts[1];
  //   const base64 = payload?.replace(/-/g, "+").replace(/_/g, "/");
  //   const decoded = Buffer.from(base64, "base64").toString("utf8");
  //   return JSON.parse(decoded);
  // },

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

      if (avatarUrl) {
        if (!user.avatar) {
          const avatar = await prisma.avatar.create({
            data: {
              url: avatarUrl,
              fileType: "image",
              size: null,
            },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              avatarId: avatar.id,
            },
          });

          user = await prisma.user.findUnique({
            where: { email },
            include: userInclude,
          });
        } else if (user.avatar.url !== avatarUrl) {
          await prisma.avatar.update({
            where: { id: user.avatar.id },
            data: {
              url: avatarUrl,
              updatedAt: new Date(),
            },
          });

          user = await prisma.user.findUnique({
            where: { email },
            include: userInclude,
          });
        }
      }

      if (name && user?.name !== name) {
        await prisma.user.update({
          where: { id: user?.id as string },
          data: { name },
        });

        user = await prisma.user.findUnique({
          where: { email },
          include: userInclude,
        });
      }
    }

    if (!user) {
      throw new InternalServerError("Failed to create or find user");
    }

    try {
      const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
      } as jwt.SignOptions);

      return { user, token };
    } catch (error) {
      throw new InternalServerError("Failed to generate authentication token");
    }
  },
};
