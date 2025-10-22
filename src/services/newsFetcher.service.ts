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

  // Process articles in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);

    for (const article of batch) {
      try {
        if (!article.link || article.link.trim().length === 0) {
          logger.warn(`Skipping article with missing link: ${article.title}`);
          continue;
        }

        // Process AI features with shorter text to avoid 400 errors
        const contentToProcess =
          article.content?.substring(0, 1000) || article.title;

        let aiSummary: string | null = null;
        let sentiment: string | null = null;
        let tags: string[] = [];
        let embeddings: number[] | null = null;

        if (contentToProcess && contentToProcess.length > 50) {
          try {
            // Process AI features sequentially with delays
            aiSummary = await summarizeText(contentToProcess);
            await sleep(1000);

            sentiment = await analyzeSentiment(contentToProcess);
            await sleep(1000);

            tags = await extractTags(contentToProcess);
            await sleep(1000);

            // Skip embeddings if not critical to save time
            // embeddings = await generateEmbeddings(contentToProcess);
          } catch (aiError: any) {
            logger.warn(
              `AI processing failed for article, continuing without AI data: ${aiError.message}`
            );
          }
        }

        const categories = (
          Array.isArray(article.category)
            ? article.category
            : [article.category]
        )
          .filter(Boolean)
          .map((c) => c?.toString().trim().toLowerCase())
          .filter((name) => name && name.length > 0);

        const normalizedTags = tags
          .map((t) => t.trim().toLowerCase())
          .filter((name) => name.length > 0 && name.length <= 50);

        const categoryRelations = categories.map((name: string) => ({
          where: { name },
          create: { name },
        }));

        const tagRelations = normalizedTags.map((name) => ({
          where: { name },
          create: { name },
        }));

        // Remove transaction to avoid timeouts, use individual operations
        const existingNews = await prisma.news.findUnique({
          where: { link: article.link },
        });

        if (existingNews) {
          // Update existing
          await prisma.news.update({
            where: { id: existingNews.id },
            data: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              author: article.author,
              summary: (aiSummary as string) || null,
              sentiment: (sentiment as string) || null,
              embeddings: (embeddings as any) || undefined,
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
          });
        } else {
          // Create new
          await prisma.news.create({
            data: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              link: article.link,
              author: article.author,
              summary: (aiSummary as string) || null,
              sentiment: (sentiment as string) || null,
              embeddings: (embeddings as any) || undefined,
              publishedAt: article.publishedAt,
              sourceRef: { connect: { id: dbSource.id } },
              categories: { connectOrCreate: categoryRelations },
              tags: { connectOrCreate: tagRelations },
            },
          });
        }

        savedCount++;
        await sleep(500);
      } catch (error: any) {
        logger.error(
          `❌ Failed to save article from ${source.name}: ${error.message}`
        );
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < newArticles.length) {
      await sleep(2000);
    }
  }

  await prisma.newsSource.update({
    where: { id: dbSource.id },
    data: { lastFetched: new Date() },
  });

  logger.info(
    `✅ ${source.name}: ${savedCount}/${newArticles.length} articles processed`
  );
  return newArticles;
};
