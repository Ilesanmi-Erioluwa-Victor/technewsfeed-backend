import express from "express";
import blogRoutes from "./routes/blog/blog.Route";
import profileRoutes from "./modules/auth/routes/profile.routes";
import authRoutes from "./modules/auth/routes/auth.routes";
import auditRoutes from "./modules/audit/routes/audit.routes";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);
router.use("/profile", profileRoutes);
router.use("/audits", auditRoutes);
export default router;
