import express from "express";
import blogRoutes from "./routes/blog/blog.Route";

const router = express.Router();

router.use("/auth");
router.use("/blogs", blogRoutes);

export default router;
