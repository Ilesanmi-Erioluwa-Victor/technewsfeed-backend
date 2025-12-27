import express from "express";
import blogRoutes from "./routes/blog/blog.Route";
import profileRoutes from "./modules/auth/routes/profile.routes";
import authRoutes from "./modules/auth/routes/auth.routes";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);
router.use("/profile", profileRoutes);
export default router;
