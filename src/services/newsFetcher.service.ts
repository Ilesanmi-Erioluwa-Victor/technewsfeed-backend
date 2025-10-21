import { summarizeText } from "@/services/huggingface.service";
import { fetchRSSFeed, sleep } from "@/services/rss.service";
import prisma from "@/utils/prismaClient";
import logger from "@/utils/logger";
import { Source } from "@/constant/sources";
import { Prisma } from "@/generated/prisma";

export const fetchFromSource = async (source: Source) => {
  let aiSummary: string | null = null;
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

  if (!articles || articles.length === 0) {
    logger.warn(`⚠️ No articles found for ${source.name}`);
    return [];
  }

  const newArticles = dbSource.lastFetched
    ? articles.filter(
        (a) => new Date(a.publishedAt) > new Date(dbSource.lastFetched!)
      )
    : articles;

  if (newArticles.length === 0) {
    logger.info(`🟡 No new articles since last fetch for ${source.name}`);
    return [];
  }

  for (const article of newArticles) {
    try {
      if (!article.link || article.link.trim().length === 0) {
        logger.warn(`Skipping article with missing link: ${article.title}`);
        continue;
      }

      if (article.content && article.content.length > 100) {
        aiSummary = await summarizeText(article.content);
        await sleep(1500);
      }

      await prisma.$transaction(async (tx) => {
        const category = article.category
          ? await tx.category.upsert({
              where: { name: article.category },
              create: { name: article.category },
              update: {},
            })
          : null;

        await tx.news.upsert({
          where: { link: article.link },
          update: {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            author: article.author,
            summary: (aiSummary as string) ?? undefined,
            publishedAt: article.publishedAt,
            updatedAt: new Date(),
            sourceRefId: dbSource.id,
            categoryId: category?.id as number,
          },
          create: {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            link: article.link,
            author: article.author,
            summary: aiSummary ?? undefined,
            publishedAt: article.publishedAt,
            sourceRef: { connect: { id: dbSource.id } },
            ...(category?.id && { categoryId: category.id }),
          } as Prisma.NewsCreateInput,
        });
      });

      savedCount++;
    } catch (articleError: any) {
      logger.error(
        `❌ Failed to save article from ${source.name}: ${
          articleError?.message || articleError
        }`
      );
    }
  }

  await prisma.newsSource.update({
    where: { id: dbSource.id },
    data: { lastFetched: new Date() },
  });

  logger.info(
    `✅ ${source.name}: ${savedCount}/${newArticles.length} new articles saved`
  );

  return newArticles;
};
