import { AuditCategoryEnum } from "@/generated/prisma";
import {
  AuditAction,
  AuditFilterOptions,
  AuditLogsResult,
  AuditSeverity,
  AuditStats,
} from "@/utils/audit/types";
import prisma from "@/utils/prismaClient";

export const getAuditLogs = async (
  options: AuditFilterOptions = {}
): Promise<AuditLogsResult> => {
  const {
    category,
    action,
    userId,
    entity,
    entityId,
    startDate,
    endDate,
    severity,
    search,
    page = 1,
    limit = 50,
  } = options;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (category) {
    where.category = {
      name: category,
    };
  }

  if (action) where.action = action;
  if (userId) where.actorId = userId;
  if (entity) where.targetType = entity;
  if (entityId) where.targetId = entityId;
  if (severity) where.severity = severity;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { actor: { name: { contains: search, mode: "insensitive" } } },
      { actor: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        category: true,
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs as any[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAuditStats = async (
  startDate?: Date,
  endDate?: Date
): Promise<AuditStats> => {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const totalLogs = await prisma.auditLog.count({ where });

  const byCategory = await prisma.auditLog.groupBy({
    by: ["categoryId"],
    _count: true,
    where,
  });

  const categories = await prisma.auditCategory.findMany({
    where: {
      id: { in: byCategory.map((item) => item.categoryId!).filter(Boolean) },
    },
  });

  const categoryStats = byCategory.map((item) => {
    const category = categories.find((c) => c.id === item.categoryId);
    return {
      category: category?.name as AuditCategoryEnum,
      count: item._count,
      percentage: (item._count / totalLogs) * 100,
    };
  });

  const bySeverity = await prisma.auditLog.groupBy({
    by: ["severity"],
    _count: true,
    where,
  });

  const byAction = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: true,
    where,
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  const toAuditSeverity = (severity: string | null): AuditSeverity => {
    if (!severity) return AuditSeverity.INFO;

    const upperSeverity = severity.toUpperCase();
    if (Object.values(AuditSeverity).includes(upperSeverity as AuditSeverity)) {
      return upperSeverity as AuditSeverity;
    }
    return AuditSeverity.INFO;
  };

  const toAuditAction = (action: string | null): AuditAction => {
    if (!action) return AuditAction.LOGIN;

    const upperAction = action.toUpperCase();
    const isValidAction = (value: string): value is AuditAction => {
      return Object.values(AuditAction).includes(value as AuditAction);
    };

    if (isValidAction(upperAction)) {
      return upperAction as AuditAction;
    }

    return AuditAction.LOGIN;
  };

  return {
    totalLogs,
    byCategory: categoryStats,
    bySeverity: bySeverity.map((item) => ({
      severity: toAuditSeverity(item.severity),
      count: item._count,
    })),
    byAction: byAction.map((item) => ({
      action: toAuditAction(item.action),
      count: item._count,
    })),
    timeframe: {
      start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate || new Date(),
    },
  };
};

export const getSystemStats = async (startDate?: Date, endDate?: Date) => {
  let start: Date | undefined = startDate;
  let end: Date | undefined = endDate;

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOptions: AuditFilterOptions = {
    startDate: start || last24Hours,
    endDate: end || new Date(),
  };

  const [totalLogs, recentLogs, stats] = await Promise.all([
    prisma.auditLog.count(),
    getAuditLogs({ ...recentOptions, limit: 100 }),
    getAuditStats(start, end),
  ]);

  return {
    totalLogs,
    recentActivity: {
      count: recentLogs.pagination.total,
      logs: recentLogs.logs.slice(0, 10),
    },
    categoryStats: stats.byCategory,
    severityDistribution: stats.bySeverity,
    topActions: stats.byAction.slice(0, 5),
  };
};

export const getLogsByCategory = async (
  category: AuditCategoryEnum,
  page: number = 1,
  limit: number = 50
) => {
  return getAuditLogs({
    category,
    page,
    limit,
  });
};

export const searchLogs = async (
  searchTerm: string,
  page: number = 1,
  limit: number = 50
) => {
  return getAuditLogs({
    search: searchTerm.trim(),
    page,
    limit,
  });
};

export const getUserLogs = async (
  userId: string,
  page: number = 1,
  limit: number = 50
) => {
  return getAuditLogs({
    userId,
    page,
    limit,
  });
};

export const exportLogsToCSV = async (logs: any[]) => {
  const csvData = logs.map((log) => ({
    Timestamp: log.createdAt.toISOString(),
    Action: log.action,
    Category: log.category?.name || "N/A",
    User: log.actor?.email || "N/A",
    Description: log.description || "N/A",
    IP: log.ipAddress || "N/A",
    Severity: log.severity,
  }));

  return [
    Object.keys(csvData[0] || {}).join(","),
    ...csvData.map((row) => Object.values(row).join(",")),
  ].join("\n");
};
