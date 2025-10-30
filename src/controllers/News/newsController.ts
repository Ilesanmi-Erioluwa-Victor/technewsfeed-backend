import { sources } from "@/constant/sources";
import { sleep } from "@/services/rss.service";
import { AppError, InternalServerError } from "@/types/errors";
import logger from "@/utils/logger";
import prisma from "@/utils/prismaClient";
import { NextFunction, Response, Request } from "express";
import { fetchFromSource } from "@/services/newsFetcher.service";

export const getExternalNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, source, limit = 20, skip = 0, featured } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
    const parsedSkip = parseInt(skip as string, 10);

    const externalNews = await prisma.externalPost.findMany({
      where: {
        ...(source && {
          sourceRef: { name: source as string },
        }),
        ...(featured && {
          isFeatured: featured === "true",
        }),
        ...(category && {
          blogPost: {
            categories: {
              some: { name: category as string },
            },
          },
        }),
      },
      include: {
        sourceRef: {
          select: { id: true, name: true, url: true },
        },
        blogPost: {
          select: {
            id: true,
            title: true,
            slug: true,
            categories: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      skip: parsedSkip,
      take: parsedLimit,
    });

    res.json({
      count: externalNews.length,
      data: externalNews,
    });
  } catch (err) {
    console.error("❌ getExternalNews error:", err);
    next(new InternalServerError("Failed to fetch external news"));
  }
};

export const fetchAndStoreNews = async () => {
  let totalProcessed = 0;
  let totalFailed = 0;

  for (const source of sources) {
    try {
      const fetched = await fetchFromSource(source);
      totalProcessed += fetched.length;
      await sleep(1200);
    } catch (err: any) {
      totalFailed++;
      logger.error(`❌ ${source.name} failed: ${err?.message || err}`);
    }
  }

  logger.info(
    `📊 News fetch completed: ${totalProcessed} new articles processed, ${totalFailed} sources failed`
  );

  return { processed: totalProcessed, failed: totalFailed };
};

export const getExternalNewsForAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 50 } = req.query;

    const externalPosts = await prisma.externalPost.findMany({
      where: {
        OR: [{ summary: null }, { summary: "" }],
      },
      orderBy: { publishedAt: "desc" },
      take: parseInt(limit as string, 10),
      select: {
        id: true,
        title: true,
        summary: true,
        link: true,
        sourceName: true,
        coverImage: true,
        publishedAt: true,
      },
    });

    res.json(externalPosts);
  } catch (err) {
    console.error("❌ getExternalNewsForAnalysis error:", err);
    next(new AppError("Failed to fetch external posts for analysis", 500));
  }
};

export const updateExternalNewsWithAI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { summary, coverImage, isFeatured } = req.body;

    if (!id) return next(new AppError("External post ID is required", 400));

    const updatedExternalPost = await prisma.externalPost.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(summary && { summary }),
        ...(coverImage && { coverImage }),
        ...(typeof isFeatured === "boolean" && { isFeatured }),
      },
    });

    res.json(updatedExternalPost);
  } catch (err) {
    console.error("❌ updateExternalNewsWithAI error:", err);
    next(new AppError("Failed to update external post with AI data", 500));
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
