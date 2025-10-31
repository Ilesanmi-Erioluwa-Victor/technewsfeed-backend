import { sources } from "@/api/v1/constant/sources";
import { AppError, BadRequestError, InternalServerError } from "@/types/errors";
import logger from "@/utils/logger";
import prisma from "@/utils/prismaClient";
import { NextFunction, Response, Request } from "express";
import { fetchFromSource } from "../../services/newsFetcher.service";
import { sleep } from "../../services/rss.service";
import { env } from "@/config/env";

export const getExternalNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { source, limit = 20, skip = 0, featured } = req.query;

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
      },
      include: {
        sourceRef: {
          select: { id: true, name: true, url: true },
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
  } catch (err: any) {
    next(new InternalServerError(err));
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
      new BadRequestError(`❌ ${source.name} failed: ${err?.message || err}`);
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
  } catch (err: any) {
    next(new AppError(err, 500));
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
  } catch (err: any) {
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
    if (env.FETCH_SECRET && secret !== env.FETCH_SECRET) {
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
