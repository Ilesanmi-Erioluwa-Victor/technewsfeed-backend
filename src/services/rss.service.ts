import axios, { AxiosRequestConfig } from "axios";
import * as xml2js from "xml2js";
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

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function normalizeContentValue(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw._) return raw._;
  return "";
}

async function fetchWithRetries(
  url: string,
  opts: AxiosRequestConfig = {},
  attempts = DEFAULT_RETRIES
): Promise<string> {
  let lastError: any = null;
  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const cfg: AxiosRequestConfig = {
        method: "get",
        url,
        timeout: opts.timeout ?? DEFAULT_TIMEOUT,
        responseType: "text",
        headers: {
          "User-Agent": `TechNewsFeedBot/1.0 (+${baseUrl}) rss-fetcher`,
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

      if (isSslError(err)) throw err;

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

async function parseFeedXml(xml: string, sourceName: string): Promise<any[]> {
  const parsed = await xml2js.parseStringPromise(xml, {
    trim: true,
    explicitArray: true,
  });

  const rssItems = parsed?.rss?.channel?.[0]?.item;
  if (Array.isArray(rssItems) && rssItems.length) return rssItems;

  const atomEntries = parsed?.feed?.entry;
  if (Array.isArray(atomEntries) && atomEntries.length) return atomEntries;

  for (const key of Object.keys(parsed)) {
    if (Array.isArray(parsed[key]) && parsed[key].some((n: any) => n.title)) {
      return parsed[key];
    }
  }

  logger.warn(`parseFeedXml: no items found for ${sourceName}`);
  return [];
}

export const fetchRSSFeed = async (
  url: string,
  sourceName: string
): Promise<Article[]> => {
  try {
    const xml = await fetchWithRetries(url);
    const items = await parseFeedXml(xml, sourceName);

    const articles: Article[] = items
      .map((item: any) => {
        const rawContent =
          item["content:encoded"]?.[0] ||
          item.content?.[0] ||
          item.summary?.[0] ||
          item.description?.[0] ||
          "";

        const content = normalizeContentValue(rawContent);

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
    if (isSslError(err)) {
      logger.warn(
        `SSL error for ${sourceName} (${url}) — attempting proxy fallback`
      );
      try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
          url
        )}`;
        const res = await axios.get(proxyUrl, { timeout: DEFAULT_TIMEOUT });
        const items = res.data?.items || [];
        return items
          .map((it: any) => {
            const content = normalizeContentValue(
              it.content || it.content_snippet || it.description || ""
            );
            const title = it.title || "No Title";
            return {
              title,
              content: cleanContent(content),
              excerpt: generateExcerpt(content, 150),
              link: it.link,
              source: sourceName,
              author: it.author || "Unknown",
              category: classifyContent(content, title),
              publishedAt: new Date(it.pubDate || Date.now()),
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
    throw new Error(`Failed to fetch ${sourceName}: ${err?.message || err}`);
  }
};
