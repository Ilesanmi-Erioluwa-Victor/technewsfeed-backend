import prisma from "@/utils/prismaClient";
import logger from "@/utils/logger";
import { fetchRSSFeed, sleep } from "@/services/rss.service";
import {
  summarizeText,
  analyzeSentiment,
  extractTags,
  generateEmbeddings,
} from "@/services/huggingface.service";
import { Source } from "@/constant/sources";


async function getCanonicalCategories(
  sourceName: string,
  sourceCategories: string[]
) {
  const categories: { id: number; name: string }[] = [];

  for (const cat of sourceCategories) {
    const trimmed = cat?.trim().toLowerCase();
    if (!trimmed) continue;

    // Lookup mapping table
    let mapping = await prisma.sourceCategoryMapping.findUnique({
      where: { sourceName_sourceCat: { sourceName, sourceCat: trimmed } },
      include: { canonical: true },
    });

    if (mapping) {
      categories.push(mapping.canonical);
      continue;
    }

    // Upsert canonical category
    const canonical = await prisma.category.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    });

    // Save mapping
    await prisma.sourceCategoryMapping.create({
      data: {
        sourceName,
        sourceCat: trimmed,
        canonicalId: canonical.id,
      },
    });

    categories.push(canonical);
  }

  return categories;
}

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
    logger.warn(`⚠️ No articles found for ${source.name}`);
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
        let tags: string[] = [];
        let embeddings: number[] | null = null;

        try {
          if (contentToProcess.length > 50) {
            aiSummary = await summarizeText(contentToProcess);
            await sleep(800);

            sentiment = await analyzeSentiment(contentToProcess);
            await sleep(800);

            tags = await extractTags(contentToProcess);
            await sleep(800);

            embeddings = await generateEmbeddings(contentToProcess);
            await sleep(1200);
          }
        } catch (aiError: any) {
          logger.warn(`AI processing failed for article: ${aiError.message}`);
        }

        const sourceCategories = Array.isArray(article.category)
          ? article.category
          : [article.category];

        const canonicalCategories = await getCanonicalCategories(
          source.name,
          sourceCategories
        );
        const categoryRelations = canonicalCategories.map((c) => ({
          where: { id: c.id },
          create: { name: c.name },
        }));

        const normalizedTags = tags
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 50);

        const tagRelations = normalizedTags.map((name) => ({
          where: { name },
          create: { name },
        }));

        const existingNews = await prisma.news.findUnique({
          where: { link: article.link },
          include: { categories: true },
        });

        if (existingNews) {
          const newCategories = canonicalCategories
            .filter(
              (c) => !existingNews.categories.some((ec) => ec.id === c.id)
            )
            .map((c) => ({ where: { id: c.id }, create: { name: c.name } }));

          await prisma.news.update({
            where: { id: existingNews.id },
            data: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              author: article.author,
              summary: (aiSummary as string) || null,
              sentiment: (sentiment as string) || null,
              embeddings: (embeddings as number[]) || undefined,
              publishedAt: article.publishedAt,
              updatedAt: new Date(),
              sourceRef: { connect: { id: dbSource.id } },
              categories: { connectOrCreate: newCategories },
              tags: { connectOrCreate: tagRelations },
            },
          });
        } else {
          await prisma.news.create({
            data: {
              title: article.title,
              content: article.content,
              excerpt: article.excerpt,
              link: article.link,
              author: article.author,
              summary: (aiSummary as string) || null,
              sentiment: (sentiment as string) || null,
              embeddings: (embeddings as number[]) || undefined,
              publishedAt: article.publishedAt,
              sourceRef: { connect: { id: dbSource.id } },
              categories: { connectOrCreate: categoryRelations },
              tags: { connectOrCreate: tagRelations },
            },
          });
        }

        savedCount++;
        await sleep(500);
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
    `✅ ${source.name}: ${savedCount}/${newArticles.length} articles processed`
  );
  return newArticles;
};
