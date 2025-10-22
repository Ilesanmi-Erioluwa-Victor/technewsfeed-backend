import {
  summarizeText,
  extractTags,
  analyzeSentiment,
  generateEmbeddings,
} from "@/services/huggingface.service";
import { fetchRSSFeed, sleep } from "@/services/rss.service";
import prisma from "@/utils/prismaClient";
import logger from "@/utils/logger";
import { Source } from "@/constant/sources";

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

      let aiSummary: string | null = null;
      let sentiment: string | null = null;
      let tags: string[] = [];
      let embeddings: number[] | null = null;

      if (article.content && article.content.length > 100) {
        aiSummary = await summarizeText(article.content);
        sentiment = await analyzeSentiment(article.content);
        tags = await extractTags(article.content);
        embeddings = await generateEmbeddings(article.content);
        await sleep(1500);
      }

      const categories = (
        Array.isArray(article.category) ? article.category : [article.category]
      )
        .filter(Boolean)
        .map((c: string) => c.trim().toLowerCase())
        .filter((name: string) => name.length > 0);

      const normalizedTags = tags
        .map((t) => t.trim().toLowerCase())
        .filter((name: string) => name.length > 0 && name.length <= 50);

      const categoryRelations = categories.map((name: string) => ({
        where: { name },
        create: { name },
      }));

      const tagRelations = normalizedTags.map((name: string) => ({
        where: { name },
        create: { name },
      }));

      await prisma.$transaction(async (tx) => {
        await tx.news.upsert({
          where: { link: article.link },
          update: {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            author: article.author,
            summary: (aiSummary as string) ?? undefined,
            sentiment: (sentiment as string) ?? undefined,
            embeddings: (embeddings as number[]) ?? undefined,
            publishedAt: article.publishedAt,
            updatedAt: new Date(),
            sourceRef: { connect: { id: dbSource.id } },
            categories: {
              set: [],
              connectOrCreate: categoryRelations,
            },
            tags: {
              set: [],
              connectOrCreate: tagRelations,
            },
          },
          create: {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            link: article.link,
            author: article.author,
            summary: (aiSummary as string) ?? undefined,
            sentiment: (sentiment as string) ?? undefined,
            embeddings: (embeddings as number[]) ?? undefined,
            publishedAt: article.publishedAt,
            sourceRef: { connect: { id: dbSource.id } },
            categories: { connectOrCreate: categoryRelations },
            tags: { connectOrCreate: tagRelations },
          },
        });
      });
      savedCount++;
    } catch (error: any) {
      logger.error(
        `❌ Failed to save article from ${source.name}: ${error.message}`
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
