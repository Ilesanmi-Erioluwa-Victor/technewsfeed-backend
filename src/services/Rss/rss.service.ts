import axios, { AxiosRequestConfig } from "axios";
import * as xml2js from "xml2js";
import https from "https";
import prisma from "@/utils/prismaClient";
import logger from "@/utils/logger";
import { generateExcerpt } from "@/utils/generateExcerpt";
import { cleanContent } from "@/utils/cleanContent";
import { classifyContent } from "@/utils/classifyContent";

export interface Article {
  title: string;
  content: string;
  excerpt: string;
  link: string;
  source: string;
  author: string;
  category: string;
  publishedAt: Date;
  guid?: string;
}

const DEFAULT_TIMEOUT = 20000;
const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 800;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isSslError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("self signed certificate") ||
    msg.includes("ssl") ||
    err?.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    err?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  );
}

function extractLink(item: any): string {
  if (!item) return "";
  if (item.link && typeof item.link[0] === "string") return item.link[0];
  const linkObj = Array.isArray(item.link) ? item.link[0] : item.link;
  if (linkObj) {
    if (linkObj.$ && linkObj.$.href) return linkObj.$.href;
    if (linkObj.href) return linkObj.href;
  }

  if (item.id && typeof item.id[0] === "string") return item.id[0];
  if (item.guid && typeof item.guid[0] === "string") return item.guid[0];

  return "";
}

async function fetchWithRetries(
  url: string,
  opts: AxiosRequestConfig = {},
  attempts = DEFAULT_RETRIES
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const cfg: AxiosRequestConfig = {
        method: "get",
        url,
        timeout: opts.timeout ?? DEFAULT_TIMEOUT,
        responseType: "text",
        headers: {
          "User-Agent":
            "TechNewsFeedBot/1.0 (+https://yourdomain.example) rss-fetcher",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        ...opts,
      };

      const res = await axios(cfg);
      return res.data as string;
    } catch (err: any) {
      lastError = err;
      const isLast = attempt === attempts;
      logger.warn(
        `Fetch attempt ${attempt}/${attempts} failed for ${url}: ${err?.message}`
      );

      // If SSL error, break early (we will fallback at caller level)
      if (isSslError(err)) {
        throw err;
      }

      if (!isLast) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await sleep(backoff);
        continue;
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/** parse xml into items (supports RSS & Atom) */
async function parseFeedXml(xml: string, sourceName: string): Promise<any[]> {
  const parsed = await xml2js.parseStringPromise(xml, {
    trim: true,
    explicitArray: true,
  });

  // RSS feed
  const rssItems = parsed?.rss?.channel?.[0]?.item;
  if (Array.isArray(rssItems) && rssItems.length) return rssItems;

  // Atom feed
  const atomEntries = parsed?.feed?.entry;
  if (Array.isArray(atomEntries) && atomEntries.length) return atomEntries;

  // Some feeds use different root names
  // Try to find the first array that looks like items
  for (const key of Object.keys(parsed)) {
    if (Array.isArray(parsed[key]) && parsed[key].some((n: any) => n.title)) {
      return parsed[key];
    }
  }

  logger.warn(`parseFeedXml: no items found for ${sourceName}`);
  return [];
}

/** Public fetchRSSFeed -------------------------------------------------- */

export const fetchRSSFeed = async (
  url: string,
  sourceName: string
): Promise<Article[]> => {
  // Step 1: try direct fetch with retries
  try {
    const xml = await fetchWithRetries(url);
    const items = await parseFeedXml(xml, sourceName);

    const articles: Article[] = items
      .map((item: any) => {
        const content =
          item["content:encoded"]?.[0] ||
          item.content?.[0] ||
          item.summary?.[0] ||
          item.description?.[0] ||
          "";

        const excerpt = generateExcerpt(content, 150);
        const author =
          item["dc:creator"]?.[0] ||
          (item.author && item.author[0]?.name) ||
          item.author?.[0] ||
          "Unknown";
        const title = item.title?.[0] || item.name?.[0] || "No Title";
        const link = extractLink(item);

        const category =
          item.category?.[0] ||
          item["dc:subject"]?.[0] ||
          classifyContent(content, title);

        return {
          title,
          content: cleanContent(content),
          excerpt,
          link,
          source: sourceName,
          author,
          category,
          publishedAt: new Date(
            item.pubDate?.[0] || item.updated?.[0] || Date.now()
          ),
          guid: item.guid?.[0] || item.id?.[0],
        } as Article;
      })
      .filter((a) => a.link && a.title && a.link.length > 0);

    return articles;
  } catch (err: any) {
    // If we detect SSL issues, try a proxy fallback (safer than disabling TLS globally)
    if (isSslError(err)) {
      logger.warn(
        `SSL error for ${sourceName} (${url}) — attempting proxy fallback`
      );
      try {
        // rss2json is an example; choose a reliable proxy or your own microservice
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
          url
        )}`;
        const res = await axios.get(proxyUrl, { timeout: DEFAULT_TIMEOUT });
        // rss2json returns JSON with `items`
        const items = res.data?.items || [];
        return items
          .map((it: any) => {
            const content =
              it.content || it.content_snippet || it.description || "";
            const title = it.title || "No Title";
            return {
              title,
              content: cleanContent(content),
              excerpt: generateExcerpt(content, 150),
              link: it.link,
              source: sourceName,
              author: it.author || "Unknown",
              category: classifyContent(content, title),
              publishedAt: new Date(it.pubDate || it.pubDate || Date.now()),
            } as Article;
          })
          .filter((a: Article) => a.link);
      } catch (proxyErr: any) {
        logger.error(
          `Proxy fallback failed for ${sourceName}: ${proxyErr?.message}`
        );
        throw new Error(`Failed to fetch ${sourceName}: ${proxyErr?.message}`);
      }
    }

    // For other errors, bubble up
    throw new Error(`Failed to fetch ${sourceName}: ${err?.message || err}`);
  }
};

/** fetchAndStoreNews -------------------------------------------------- */
export const fetchAndStoreNews = async () => {
  const sources = [
    { url: "https://blogs.nvidia.com/feed/", name: "NVIDIA Blog" },
    { url: "https://blog.jetbrains.com/feed/", name: "JetBrains Blog" },
    { url: "https://stackoverflow.blog/feed/", name: "Stack Overflow Blog" },
    {
      url: "https://aws.amazon.com/blogs/machine-learning/feed/",
      name: "AWS ML",
    },
    { url: "https://huggingface.blog/feed.xml", name: "Hugging Face" },
    { url: "https://webkit.org/feed/", name: "WebKit" },
    {
      url: "https://blog.chromium.org/feeds/posts/default",
      name: "Chromium Blog",
    },
    {
      url: "https://developer.mozilla.org/en-US/blog/rss.xml",
      name: "MDN Blog",
    },
    {
      url: "https://www.schneier.com/feed/atom/",
      name: "Schneier on Security",
    },
  ];

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const source of sources) {
    logger.info(`🔎 Fetching ${source.name} — ${source.url}`);
    try {
      const articles = await fetchRSSFeed(source.url, source.name);
      // polite delay between sources
      await sleep(1200);

      if (!articles || articles.length === 0) {
        logger.warn(`No articles returned for ${source.name}`);
      }

      let savedCount = 0;
      for (const article of articles) {
        try {
          // guard: skip if no link
          if (!article.link || article.link.trim().length === 0) {
            logger.warn(
              `Skipping article with empty link from ${source.name}: ${article.title}`
            );
            continue;
          }

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
        } catch (articleError: any) {
          logger.error(
            `Failed to save article from ${source.name}: ${
              articleError?.message || articleError
            }`
          );
        }
      }

      totalProcessed += savedCount;
      logger.info(
        `✅ ${source.name}: Saved ${savedCount}/${articles.length} articles`
      );
    } catch (err: any) {
      totalFailed++;
      logger.error(`❌ ${source.name} failed: ${err?.message || err}`);
    }
  }

  logger.info(
    `📊 News fetch completed: ${totalProcessed} articles processed, ${totalFailed} sources failed`
  );
  return { processed: totalProcessed, failed: totalFailed };
};
