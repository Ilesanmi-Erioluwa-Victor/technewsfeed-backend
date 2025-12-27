import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        userId?: string;
        // destroy?: (callback: (err: any) => void) => void;
        // ... other session methods/properties
      };
      user?: {
        id: string;
        email: string;
        role: string;
        name?: string;
        isVerified: boolean;
      };
      userId?: string;
    }
  }
}

export {};
