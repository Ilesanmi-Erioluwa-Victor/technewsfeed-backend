import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "@/types/errors";

export const requireRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError("Authentication required");
      }
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(", ")}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
