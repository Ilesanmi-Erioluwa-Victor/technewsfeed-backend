import { authenticate } from "@/middlewares/auth.middlewares";
import { requireRole } from "@/middlewares/role.middleware";
import { Router } from "express";
import {
  getCategoryStats,
  getLogs,
  getLogsByCategory,
  getSystemStats,
  getUserLogs,
  searchLogs,
} from "../controller/audit.controller";

const router = Router();

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/", getLogs);

router.get("/category/:category", getLogsByCategory);

router.get("/search", searchLogs);

router.get("/stats/category", getCategoryStats);

router.get("/stats/system", getSystemStats);

router.get("/my-logs", authenticate, getUserLogs);

export default router;
