import { AuditCategoryEnum } from "@/generated/prisma";
import { getAuditLogs, getAuditStats } from "@/utils/audit/auditService";
import { AuditFilterOptions } from "@/utils/audit/types";
import prisma from "@/utils/prismaClient";
import { Request, Response, NextFunction } from "express";

export const getLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
    } = req.query;

    const options: AuditFilterOptions = {
      category: category as AuditCategoryEnum,
      action: action as any,
      userId: userId as string,
      entity: entity as any,
      entityId: entityId as string,
      severity: severity as any,
      search: search as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    };

    // Parse dates if provided
    if (startDate) {
      options.startDate = new Date(startDate as string);
    }
    if (endDate) {
      options.endDate = new Date(endDate as string);
    }

    const result = await getAuditLogs(options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getLogsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const options: AuditFilterOptions = {
      category: category as AuditCategoryEnum,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    };

    const result = await getAuditLogs(options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const searchLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q: searchTerm, page = 1, limit = 50 } = req.query;

    if (
      !searchTerm ||
      typeof searchTerm !== "string" ||
      searchTerm.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        error: "Search term must be at least 2 characters",
      });
    }

    const options: AuditFilterOptions = {
      search: searchTerm.trim(),
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    };

    const result = await getAuditLogs(options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    const stats = await getAuditStats(start, end);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 50 } = req.query;

    const options: AuditFilterOptions = {
      userId: userId as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    };

    const result = await getAuditLogs(options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

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

    res.json({
      success: true,
      data: {
        totalLogs,
        recentActivity: {
          count: recentLogs.pagination.total,
          logs: recentLogs.logs.slice(0, 10),
        },
        categoryStats: stats.byCategory,
        severityDistribution: stats.bySeverity,
        topActions: stats.byAction.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};
