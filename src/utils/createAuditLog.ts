import { AuditLogData, getCategoryFromAction } from "@/types/audit.types";
import prisma from "@/utils/prismaClient";

export const createAuditLog = async (data: AuditLogData) => {
  try {
    const categoryName =
      data.categoryName || getCategoryFromAction(data.action);

    let auditCategory = await prisma.auditCategory.findUnique({
      where: { name: categoryName },
    });

    if (!auditCategory) {
      auditCategory = await prisma.auditCategory.create({
        data: {
          name: categoryName,
          description: `Category for ${categoryName} actions`,
          isActive: true,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: data.action,
        categoryId: auditCategory.id,
        actorId: data.userId,
        targetId: data.entityId as string,
        targetType: data.entity as string,
        description: data.description as string,
        payload: {
          oldValue: data.oldValue,
          newValue: data.newValue,
          metadata: data.metadata,
        },
        ipAddress: data.ipAddress as string,
        userAgent: data.userAgent as string,
        severity: data.severity || "INFO",
        sessionId: data.sessionId as string,
        metadata: data.metadata as any,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};
