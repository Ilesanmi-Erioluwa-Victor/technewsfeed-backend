import prisma from "@/utils/prismaClient";
import logger from "@/utils/logger";
import { fetchRSSFeed, sleep } from "../services/rss.service";
import {
  summarizeText,
  analyzeSentiment,
} from "../services/huggingface.service";
import { Source } from "@/api/v1/constant/sources";

export const fetchFromSource = async (source: Source) => {
  let savedCount = 0;

  let dbSource = await prisma.newsSource.findUnique({
    where: { name: source.name },
  });

  if (!dbSource) {
    dbSource = await prisma.newsSource.create({
      data: { name: source.name, url: source.url, lastFetched: null },
    });
  }

  const articles = await fetchRSSFeed(source.url, source.name);
  if (!articles?.length) {
    return [];
  }

  const newArticles = dbSource.lastFetched
    ? articles.filter(
        (a) => new Date(a.publishedAt) > new Date(dbSource.lastFetched!)
      )
    : articles;

  if (!newArticles.length) {
    logger.info(`🟡 No new articles since last fetch for ${source.name}`);
    return [];
  }

  const BATCH_SIZE = 5;
  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);

    for (const article of batch) {
      try {
        if (!article.link || !article.title) continue;

        const contentToProcess =
          article.content?.substring(0, 1024) || article.title;

        let aiSummary: string | null = null;
        let sentiment: string | null = null;

        try {
          if (contentToProcess.length > 50) {
            aiSummary = await summarizeText(contentToProcess);
            await sleep(700);
            sentiment = await analyzeSentiment(contentToProcess);
            await sleep(700);
          }
        } catch (aiError: any) {
          logger.warn(
            `⚠️ AI processing failed for article: ${aiError.message}`
          );
        }

        const existing = await prisma.externalPost.findUnique({
          where: { link: article.link },
        });

        if (existing) {
          await prisma.externalPost.update({
            where: { id: existing.id },
            data: {
              title: article.title,
              summary: aiSummary || existing.summary,
              coverImage: article.image || existing.coverImage || null,
              publishedAt: article.publishedAt,
              sentiment: sentiment || existing.sentiment,
              authorName: article.author,
              sourceName: source.name,
              sourceUrl: source.url,
              sourceRef: { connect: { id: dbSource.id } },
            },
          });
        } else {
          await prisma.externalPost.create({
            data: {
              title: article.title,
              summary: aiSummary,
              link: article.link,
              coverImage: article.image || null,
              publishedAt: article.publishedAt,
              sourceName: source.name,
              sourceUrl: source.url,
              sentiment,
              authorName: article.author,
              isFeatured: false,
              sourceRef: { connect: { id: dbSource.id } },
            },
          });
        }

        savedCount++;
      } catch (err: any) {
        logger.error(
          `❌ Failed to process article ${article.title}: ${err.message}`
        );
      }
    }

    if (i + BATCH_SIZE < newArticles.length) await sleep(1500);
  }

  await prisma.newsSource.update({
    where: { id: dbSource.id },
    data: { lastFetched: new Date() },
  });

  logger.info(
    `✅ ${source.name}: ${savedCount}/${newArticles.length} new articles processed`
  );
  return newArticles;
};
