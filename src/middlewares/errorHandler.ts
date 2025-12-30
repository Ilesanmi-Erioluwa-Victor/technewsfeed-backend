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
      logger.warn(`Operational error: ${message}`, {
        method: req.method,
        url: req.url,
        statusCode,
        validationErrors:
          validationErrors.length > 0 ? validationErrors : undefined,
      });
    } else {
      logger.error(`Non-operational error`, {
        method: req.method,
        url: req.url,
        errorName: err.name,
        // message: err.message,
        stack: err.stack,
      });
    }
  } else {
    logger.error(`Unhandled exception`, {
      method: req.method,
      url: req.url,
      errorName: err.name,
      message: err.message,
      stack: err.stack,
    });

    // In development, show the actual error message
    if (process.env.NODE_ENV === "development") {
      message = err.message;
    }
  }

  const response: any = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === "development" && validationErrors.length > 0) {
    response.validationErrors = validationErrors;
  }

  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
