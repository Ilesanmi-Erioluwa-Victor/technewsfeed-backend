import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "@/types/errors";
import logger from "@/utils/logger";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let validationErrors: ValidationError[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    validationErrors = err.validationErrors || [];

    if (err.isOperational) {
      logger.warn(`Operational error`, {
        method: req.method,
        url: req.url,
        message,
      });
    } else {
      logger.error(`Non-operational error`, {
        method: req.method,
        url: req.url,
        errorName: err.name,
      });

      if (process.env.NODE_ENV === "development") {
        logger.error(err.stack);
      }
    }
  } else {
    logger.error(`Unhandled exception`, {
      method: req.method,
      url: req.url,
      message: err.message,
    });

    if (process.env.NODE_ENV === "development") {
      logger.error(err.stack);
      message = err.message;
    }
  }

  const response: any = {
    success: false,
    message,
  };

  if (validationErrors.length) {
    response.validationErrors = validationErrors;
  }

  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export const asyncHandler =
  (fn: (...args: any[]) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
