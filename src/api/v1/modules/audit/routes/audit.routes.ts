import { authenticate } from "@/middlewares/auth.middlewares";
import { requireRole } from "@/middlewares/role.middleware";
import { Router } from "express";
import {
  exportLogs,
  getCategoryStats,
  getLogs,
  getLogsByCategoryHandler,
  getSystemStatsHandler,
  getUserLogsHandler,
  searchLogsHandler,
} from "../controller/audit.controller";

const router = Router();

router.get("/my-logs", authenticate, getUserLogsHandler);

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/", getLogs);

router.get("/stats/system", getSystemStatsHandler);

router.get("/export", exportLogs);

router.get("/my-logs", authenticate, getUserLogsHandler);

export default router;
