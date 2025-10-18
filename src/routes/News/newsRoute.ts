import {
  getNews,
  getNewsForAnalysis,
  updateNewsWithAI,
  fetchNews,
} from "@/controllers/News/newsController";
import express from "express";

const router = express.Router();

router.get("/fetch", fetchNews);
router.get("/", getNews);

router.get("/for-analysis", getNewsForAnalysis);
router.patch("/:id/ai-update", updateNewsWithAI);

export default router;
