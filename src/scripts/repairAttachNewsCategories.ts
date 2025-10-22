import prisma from "@/utils/prismaClient";
import { Prisma } from "@/generated/prisma";

type MatchResult = {
  newsId: number;
  title: string | null;
  matchedCategoryId?: number;
  matchedCategoryName?: string;
  method:
    | "title_word"
    | "content_word"
    | "excerpt_word"
    | "tags"
    | "substring"
    | "none";
};

(async () => {
  // === CONFIG ===
  const dryRun = true; // set to false to actually perform updates
  const limit = undefined as number | undefined; // set a number to limit processed rows (for testing)

  try {
    console.log("🔎 Loading categories...");
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });

    if (!categories || categories.length === 0) {
      console.warn("⚠️ No categories found in DB. Aborting.");
      return;
    }

    console.log(`ℹ️ Found ${categories.length} categories.`);

    // Build regexes for faster checking
    const categoryChecks = categories.map((c) => {
      // prepare escaped word boundary regex for exact-word checks
      const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`\\b${escaped}\\b`, "iu");
      const substringRegex = new RegExp(escaped, "iu");
      return { id: c.id, name: c.name, wordRegex, substringRegex };
    });

    // Fetch news missing categoryId
    const whereClause: Prisma.NewsWhereInput = { categoryId: null };
    const missingNews = await prisma.news.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        tags: true,
      },
      ...(limit !== undefined ? { take: limit } : {}),
      orderBy: { id: "asc" },
    });

    console.log(`🗂️ News without categoryId: ${missingNews.length}`);

    const matches: MatchResult[] = [];
    const notMatched: MatchResult[] = [];

    for (const n of missingNews) {
      const title = n.title ?? "";
      const content = (n.content ?? "") + " " + (n.excerpt ?? "");
      const excerpt = n.excerpt ?? "";
      const textForWordCheck = `${title} ${content} ${excerpt}`;

      // 1) exact word match in title/content/excerpt
      let found: { id: number; name: string } | null = null;
      for (const c of categoryChecks) {
        if (c.wordRegex.test(title)) {
          found = { id: c.id, name: c.name };
          matches.push({
            newsId: n.id,
            title: title,
            matchedCategoryId: c.id,
            matchedCategoryName: c.name,
            method: "title_word",
          });
          break;
        }
      }
      if (found) continue;

      // check content / excerpt exact word
      for (const c of categoryChecks) {
        if (c.wordRegex.test(content) || c.wordRegex.test(excerpt)) {
          found = { id: c.id, name: c.name };
          matches.push({
            newsId: n.id,
            title: title,
            matchedCategoryId: c.id,
            matchedCategoryName: c.name,
            method: "content_word",
          });
          break;
        }
      }
      if (found) continue;

      // 2) check tags (if present) — tags might be JSON or string
      let tagsMatched = false;
      if (n.tags) {
        try {
          // try to normalize tags into array of strings
          let parsed: any = n.tags;
          if (typeof n.tags === "string") {
            parsed = JSON.parse(n.tags);
          }
          if (Array.isArray(parsed)) {
            const tagStrings = parsed.map((t) => String(t).toLowerCase());
            for (const c of categoryChecks) {
              if (tagStrings.includes(c.name.toLowerCase())) {
                found = { id: c.id, name: c.name };
                matches.push({
                  newsId: n.id,
                  title,
                  matchedCategoryId: c.id,
                  matchedCategoryName: c.name,
                  method: "tags",
                });
                tagsMatched = true;
                break;
              }
            }
          }
        } catch (err) {
          // not JSON — ignore
        }
      }
      if (tagsMatched || found) continue;

      // 3) substring fallback (less strict) in title/content/excerpt
      for (const c of categoryChecks) {
        if (c.substringRegex.test(textForWordCheck)) {
          found = { id: c.id, name: c.name };
          matches.push({
            newsId: n.id,
            title,
            matchedCategoryId: c.id,
            matchedCategoryName: c.name,
            method: "substring",
          });
          break;
        }
      }
      if (found) continue;

      // 4) nothing found
      notMatched.push({ newsId: n.id, title, method: "none" });
    }

    console.log(`✅ Proposed automatic matches: ${matches.length}`);
    console.log(`❌ Could not match: ${notMatched.length}`);

    // Print short preview
    const previewLimit = 50;
    console.log("---- Sample matches ----");
    for (const m of matches.slice(0, previewLimit)) {
      console.log(
        `#${m.newsId} → ${m.matchedCategoryName} (${m.method}) — ${m.title}`
      );
    }
    console.log("---- Unmatched (sample) ----");
    for (const u of notMatched.slice(0, previewLimit)) {
      console.log(`#${u.newsId} — ${u.title}`);
    }

    if (matches.length === 0) {
      console.log("ℹ️ No automatic matches found. Exiting.");
      return;
    }

    if (dryRun) {
      console.log(
        "🟡 Dry run enabled — no DB updates performed. To apply changes, set `dryRun = false` at the top of this script."
      );
      return;
    }

    // === APPLY UPDATES ===
    console.log("🔁 Applying updates in a transaction...");

    await prisma.$transaction(async (tx) => {
      for (const m of matches) {
        await tx.news.update({
          where: { id: m.newsId },
          data: {
            category: {
              connect: { id: m.matchedCategoryId! },
            },
          },
        });
      }
    });

    console.log("✅ Updates applied.");
    console.log(`🔁 Linked ${matches.length} news items to categories.`);
    if (notMatched.length > 0) {
      console.log(`⚠️ ${notMatched.length} remain unmatched.`);
    }
  } catch (error) {
    console.error("❌ Error during repair:", error);
  } finally {
    await prisma.$disconnect();
  }
})();
