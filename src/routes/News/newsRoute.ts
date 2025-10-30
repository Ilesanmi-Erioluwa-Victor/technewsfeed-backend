import {
  getExternalNews,
  getExternalNewsForAnalysis,
  updateExternalNewsWithAI,
  fetchNews,
} from "@/controllers/News/newsController";
import express from "express";

const router = express.Router();

router.get("/fetch", fetchNews);
router.get("/", getExternalNews);

router.get("/for-analysis", getExternalNewsForAnalysis);
router.patch("/:id/ai-update", updateExternalNewsWithAI);

export default router;
