import prisma from "@/utils/prismaClient";

(async () => {
  try {
    const totalNews = await prisma.news.count();
    const linkedNews = await prisma.news.count({
      where: { sourceRefId: { not: null } },
    });
    const unlinkedNews = totalNews - linkedNews;

    console.log(`📰 Total news articles: ${totalNews}`);
    console.log(`🔗 Linked to NewsSource: ${linkedNews}`);
    console.log(`🚫 Without sourceRef: ${unlinkedNews}`);

    if (unlinkedNews === 0) {
      console.log("✅ All news articles are linked to a NewsSource!");
    } else {
      console.warn("⚠️ Some news articles are missing a sourceRef.");
      const missing = await prisma.news.findMany({
        where: { sourceRefId: null },
        include: {
          sourceRef: {
            select: {
              name: true,
              url: true,
            },
          },
          category: {
            select: {
              name: true,
              description: true
            }
          }
        },

        take: 10, 
      });
      console.table(missing);
    }
  } catch (err) {
    console.error("❌ Error checking News sources:", err);
  } finally {
    await prisma.$disconnect();
  }
})();
