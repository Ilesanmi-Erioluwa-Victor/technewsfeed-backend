import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/errors";
import logger from "../utils/logger";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error(`${req.method} ${req.url} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
  });
};
