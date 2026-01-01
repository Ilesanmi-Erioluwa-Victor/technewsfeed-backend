import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { BadRequestError, createValidationErrors } from "@/types/errors";

export const validate = <T>(schema: ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyToValidate = req.body || {};

      const validatedData = await schema.parseAsync(bodyToValidate);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => {
          const field = issue.path.join(".") || "body";
          let message = issue.message;

          if (message.includes("expected string, received undefined")) {
            message = "is required";
          } else if (message.includes("expected string, received null")) {
            message = "cannot be empty";
          } else if (message.includes("expected number, received string")) {
            message = "must be a number";
          } else if (message.includes("Invalid enum value")) {
            message = "has an invalid value";
          } else if (message.includes("regex")) {
            message = "has an invalid format";
          }

          return {
            path: issue.path,
            message: message.charAt(0).toUpperCase() + message.slice(1),
          };
        });

        const validationErrors = createValidationErrors(issues);
        const firstError = validationErrors[0];
        const errorMessage = firstError
          ? `${firstError.field}: ${firstError.message}`
          : "Validation failed";

        next(new BadRequestError(errorMessage, validationErrors));
      } else {
        next(error);
      }
    }
  };
};

export const validateBody = <T>(schema: ZodType<T>) => validate<T>(schema);

export const validateParams = <T>(schema: ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationIssues = error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        }));

        const validationErrors = createValidationErrors(validationIssues);
        next(
          new BadRequestError("Invalid request parameters", validationErrors)
        );
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = <T>(schema: ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationIssues = error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        }));

        const validationErrors = createValidationErrors(validationIssues);
        next(new BadRequestError("Invalid query parameters", validationErrors));
      } else {
        next(error);
      }
    }
  };
};
