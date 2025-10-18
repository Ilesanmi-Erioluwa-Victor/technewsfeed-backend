import { sources } from "@/constant/sources";
import { Prisma } from "@/generated/prisma";
import { fetchRSSFeed } from "@/services/Rss/rss.service";
import { AppError } from "@/types/errors";
import logger from "@/utils/logger";
import prisma from "@/utils/prismaClient";
import { NextFunction, Response, Request } from "express";

export const getNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, source, limit = 20, skip = 0 } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10), 50);

    const where: any = {};
    if (category) where.category = category as string;
    if (source) where.source = source as string;

    const news = await prisma.news.findMany({
      where: {
        ...(category && { category: category as string }),
        ...(source && { source: source as string }),
      },
      orderBy: { publishedAt: "desc" },
      skip: parseInt(skip as string, 10),
      take: parsedLimit,
    });

    res.json(news);
  } catch (err) {
    next(new AppError("Failed to fetch news", 500));
  }
};

export const fetchAndStoreNews = async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const source of sources) {
    try {
      const articles = await fetchRSSFeed(source.url, source.name);
      await delay(2000);

      let savedCount = 0;
      for (const article of articles) {
        try {
          await prisma.news.upsert({
            where: { link: article.link },
            update: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              author: article.author,
              category: article.category,
              publishedAt: article.publishedAt,
              updatedAt: new Date(),
            },
            create: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              link: article.link,
              source: article.source,
              author: article.author,
              category: article.category,
              publishedAt: article.publishedAt,
            },
          });
          savedCount++;
        } catch (articleError) {
          logger.error(
            `Failed to save article from ${source.name}:`,
            articleError
          );
        }
      }

      totalProcessed += savedCount;
      logger.info(
        `✅ ${source.name}: Saved ${savedCount}/${articles.length} articles`
      );
    } catch (err: any) {
      totalFailed++;
      logger.error(`❌ ${source.name} failed: ${err.message}`);
    }
  }

  logger.info(
    `📊 News fetch completed: ${totalProcessed} articles processed, ${totalFailed} sources failed`
  );
  return { processed: totalProcessed, failed: totalFailed };
};

export const getNewsForAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 50 } = req.query;

    const news = await prisma.news.findMany({
      where: {
        OR: [
          { summary: null },
          { embeddings: { equals: Prisma.DbNull } },
          { embeddings: { equals: Prisma.JsonNull } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: parseInt(limit as string),
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        source: true,
        category: true,
      },
    });

    res.json(news);
  } catch (err) {
    next(new AppError("Failed to fetch news for analysis", 500));
  }
};

export const updateNewsWithAI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req?.params;
    const { summary, sentiment, tags, embeddings } = req.body;

    if (!id) return next(new AppError("News ID is required", 400));
    if (!summary && !sentiment && !tags && !embeddings)
      return next(new AppError("No data provided for update", 400));

    const updatedNews = await prisma.news.update({
      where: { id: parseInt(id as string) },
      data: {
        summary,
        sentiment,
        tags,
        embeddings,
        updatedAt: new Date(),
      },
    });

    res.json(updatedNews);
  } catch (err) {
    next(new AppError("Failed to update news with AI data", 500));
  }
};

export const fetchNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const secret = req.query.secret;
    if (process.env.FETCH_SECRET && secret !== process.env.FETCH_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await fetchAndStoreNews();
    res.json({
      success: true,
      message: "News fetched successfully",
      processed: result.processed,
      failed: result.failed,
    });
  } catch (err) {
    next(err);
  }
};
