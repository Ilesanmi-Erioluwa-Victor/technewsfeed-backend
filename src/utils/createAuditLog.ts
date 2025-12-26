import { InternalServerError } from "@/types/errors";
import prisma from "@/utils/prismaClient";

export const createAuditLog = async (data: {
  userId: string;
  action: string;
  category: string;
  entity?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        actorId: data.userId,
        targetId: data.entityId as string,
        targetType: data.entity as string,
        description: data.description as string,
        payload: {
          oldValue: data.oldValue,
          newValue: data.newValue,
        },
      },
    });
  } catch (error) {
    throw new InternalServerError("Failed to create audit log");
  }
};
