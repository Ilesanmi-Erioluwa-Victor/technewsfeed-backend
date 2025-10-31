import {
  getExternalNews,
  getExternalNewsForAnalysis,
  updateExternalNewsWithAI,
  fetchNews,
} from "@/api/v1/controllers/blog/blog.Controller";
import express from "express";

const router = express.Router();

router.get("/fetch", fetchNews);
router.get("/external", getExternalNews);

router.get("/for-analysis", getExternalNewsForAnalysis);
router.patch("/:id/ai-update", updateExternalNewsWithAI);

export default router;
