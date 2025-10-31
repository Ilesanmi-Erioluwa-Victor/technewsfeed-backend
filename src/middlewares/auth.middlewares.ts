import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";

interface JwtPayload {
  userId: string;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "No token provided" });
    }

    const [bearer, token] = header.split(" ");
    if (bearer !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
};
