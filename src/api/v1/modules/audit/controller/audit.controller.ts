import { AuditCategoryEnum } from "@/generated/prisma";
import { AuditFilterOptions } from "@/utils/audit/types";
import { NextFunction, Request, Response } from "express";
import {
  exportLogsToCSV,
  getAuditLogs,
  getAuditStats,
  getLogsByCategory,
  getSystemStats,
  getUserLogs,
  searchLogs,
} from "../services/audit.service";

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

export const getLogsByCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await getLogsByCategory(
      category as AuditCategoryEnum,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const searchLogsHandler = async (
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

    const result = await searchLogs(
      searchTerm.trim(),
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );

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

export const getUserLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const result = await getUserLogs(
      userId,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemStatsHandler = async (
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

    const stats = await getSystemStats(start, end);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const exportLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, format = "json" } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    const result = await getAuditLogs({
      startDate: start as Date,
      endDate: end as Date,
      limit: 10000,
    });

    if (format === "csv") {
      const csv = await exportLogsToCSV(result.logs);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${Date.now()}.csv`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: result.logs,
      metadata: {
        total: result.pagination.total,
        exportedAt: new Date(),
        timeframe: {
          start: start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: end || new Date(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
