import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { BadRequestError } from "@/types/errors";

export const validate = <T>(schema: ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        next(new BadRequestError(issues[0]?.message || "Validation failed"));
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
      handleZodError(error, next, "Invalid request parameters");
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
      handleZodError(error, next, "Invalid query parameters");
    }
  };
};

const handleZodError = (
  error: unknown,
  next: NextFunction,
  defaultMessage?: string
) => {
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    next(
      new BadRequestError(
        issues[0]?.message || defaultMessage || "Validation failed"
      )
    );
  } else {
    next(error);
  }
};
