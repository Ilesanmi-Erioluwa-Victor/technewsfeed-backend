import express from "express";
import blogRoutes from "./routes/blog/blog.Route";
import authRoutes from "./modules/auth/routes/auth.routes";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);

export default router;
