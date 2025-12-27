import type { Response } from "express";

export type ValidationError = {
  field: string;
  message: string;
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  validationErrors: ValidationError[] = [];

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    validationErrors?: ValidationError[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.validationErrors = validationErrors || [];
    Error.captureStackTrace(this, this.constructor);
  }

  hasValidationErrors(): boolean {
    return this.validationErrors.length > 0;
  }

  addValidationError(field: string, message: string): void {
    this.validationErrors.push({ field, message });
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", validationErrors?: ValidationError[]) {
    super(message, 400, true, validationErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message = "Unprocessable Entity",
    validationErrors?: ValidationError[]
  ) {
    super(message, 422, true, validationErrors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too Many Requests") {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, false);
  }
}

export class NotImplementedError extends AppError {
  constructor(message = "Not Implemented") {
    super(message, 501);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service Unavailable") {
    super(message, 503);
  }
}

export const successResponse = <T = any>(
  res: Response,
  data: T,
  message = "Success",
  status = 200
): Response => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

export const createValidationErrors = (
  issues: Array<{ path: (string | number | symbol)[]; message: string }>
): ValidationError[] => {
  return issues.map((issue) => ({
    field: issue.path.map(String).join(".") || "root",
    message: issue.message,
  }));
};
