import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { BadRequestError, createValidationErrors } from "@/types/errors";

export const validate = <T>(schema: ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = createValidationErrors(
          error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          }))
        );

        const firstError = validationErrors[0];
        next(
          new BadRequestError(
            firstError
              ? `${firstError.field}: ${firstError.message}`
              : "Validation failed",
            validationErrors
          )
        );
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
        const validationErrors = createValidationErrors(
          error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          }))
        );
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
        const validationErrors = createValidationErrors(
          error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          }))
        );
        next(new BadRequestError("Invalid query parameters", validationErrors));
      } else {
        next(error);
      }
    }
  };
};
