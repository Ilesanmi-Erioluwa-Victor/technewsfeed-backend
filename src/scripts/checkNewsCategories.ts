import prisma from "@/utils/prismaClient";

(async () => {
  try {
    const totalNews = await prisma.news.count();
    const linkedToCategory = await prisma.news.count({
      where: { categoryId: { not: null } },
    });

    console.log("📰 Total news articles:", totalNews);
    console.log("📂 Linked to Category:", linkedToCategory);
    console.log("🚫 Without Category:", totalNews - linkedToCategory);

    if (totalNews === linkedToCategory) {
      console.log("✅ All news articles have valid categoryId!");
    } else {
      console.log("⚠️ Some news articles are missing a categoryId.");
      const missing = await prisma.news.findMany({
        where: { categoryId: null },
        select: { id: true, title: true },
      });
      console.table(missing);
    }
  } catch (error) {
    console.error("❌ Error checking categories:", error);
  } finally {
    await prisma.$disconnect();
  }
})();
