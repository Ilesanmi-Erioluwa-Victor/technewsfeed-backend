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

export const fetchFromSource = async (source: Source) => {
  let savedCount = 0;

  // Ensure source exists
  let dbSource = await prisma.newsSource.upsert({
    where: { name: source.name },
    update: {},
    create: { name: source.name, url: source.url },
  });

  const articles = await fetchRSSFeed(source.url, source.name);
  if (!articles?.length) {
    logger.warn(`⚠️ No articles found for ${source.name}`);
    return [];
  }

  // Optional: find a BlogPost to attach to (for grouping)
  // e.g. one titled like the source name
  let parentBlogPost = await prisma.blogPost.findFirst({
    where: { title: { contains: source.name, mode: "insensitive" } },
  });

  if (!parentBlogPost) {
    parentBlogPost = await prisma.blogPost.create({
      data: {
        title: `${source.name} News Feed`,
        slug: `${source.name.toLowerCase().replace(/\s+/g, "-")}-feed`,
        summary: `Aggregated latest news from ${source.name}`,
        publishedAt: new Date(),
      },
    });
  }

  for (const article of articles) {
    try {
      if (!article.link || !article.title) continue;

      const aiSummary = await summarizeText(article.content);
      const sentiment = await analyzeSentiment(article.content);
      const tags = await extractTags(article.content);
      const embeddings = await generateEmbeddings(article.content);

      const existing = await prisma.externalPost.findUnique({
        where: { link: article.link },
      });

      if (existing) {
        await prisma.externalPost.update({
          where: { id: existing.id },
          data: {
            title: article.title,
            summary: aiSummary,
            coverImage: existing.coverImage || null,
            publishedAt: article.publishedAt,
            sourceName: source.name,
            authorName: article.author,
            sourceRef: { connect: { id: dbSource.id } },
            blogPost: { connect: { id: parentBlogPost.id } },
          },
        });
      } else {
        await prisma.externalPost.create({
          data: {
            title: article.title,
            summary: aiSummary,
            coverImage: null,
            link: article.link,
            publishedAt: article.publishedAt,
            sourceName: source.name,
            sourceUrl: source.url,
            authorName: article.author,
            isFeatured: false,
            sourceRef: { connect: { id: dbSource.id } },
            blogPost: { connect: { id: parentBlogPost.id } },
          },
        });
      }

      savedCount++;
      await sleep(400);
    } catch (err: any) {
      logger.error(
        `❌ Failed to process article ${article.title}: ${err.message}`
      );
    }
  }

  await prisma.newsSource.update({
    where: { id: dbSource.id },
    data: { lastFetched: new Date() },
  });

  logger.info(
    `✅ ${source.name}: ${savedCount}/${articles.length} external articles saved and attached to BlogPost`
  );
  return articles;
};
