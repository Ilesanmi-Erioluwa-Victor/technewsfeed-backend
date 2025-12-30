import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { UnauthorizedError } from "@/types/errors";
import prisma from "@/utils/prismaClient";

interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw new UnauthorizedError("No authorization token provided");
    }

    const [bearer, token] = header.split(" ");

    if (bearer !== "Bearer" || !token) {
      throw new UnauthorizedError("Invalid authorization format");
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        isActive: true,
        avatar: true,
      },
    });

    // if (!user) {
    //   throw new UnauthorizedError("User not found,");
    // }

    if (!user?.isVerified) {
      throw new UnauthorizedError(
        "You are not verified yet, please verify your account"
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is deactivated");
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name as string,
      role: user.role,
      isVerified: user.isVerified,
    };

    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Token expired"));
    } else {
      next(error);
    }
  }
};
