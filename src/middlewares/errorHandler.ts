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
  let stack: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    validationErrors = err.validationErrors || [];

    if (err.isOperational) {
      logger.warn(`Operational Error: ${req.method} ${req.url} - ${message}`, {
        validationErrors,
      });
    } else {
      logger.error(`Programmer Error: ${req.method} ${req.url} - ${message}`, {
        stack: err.stack,
        validationErrors,
      });
      if (process.env.NODE_ENV === "development") {
        stack = err.stack;
      }
    }
  } else {
    logger.error(
      `Unexpected Error: ${req.method} ${req.url} - ${err.message}`,
      {
        stack: err.stack,
      }
    );

    if (process.env.NODE_ENV === "development") {
      message = err.message;
      stack = err.stack;
    }
  }

  const response: any = {
    success: false,
    message,
  };

  if (validationErrors.length > 0) {
    response.validationErrors = validationErrors;
  }

  if (process.env.NODE_ENV === "development" && stack) {
    response.stack = stack;
  }

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
