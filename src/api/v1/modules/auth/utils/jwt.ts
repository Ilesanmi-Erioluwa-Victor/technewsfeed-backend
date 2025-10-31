import { User } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const createAccessToken = (user: User) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );
};

export const createRefreshToken = (user: User) => {
  return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "7d",
  });
};
