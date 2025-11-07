import logger from "@/utils/logger";
import prisma from "@/utils/prismaClient";
import cron from "node-cron";

cron.schedule("0 */4 * * *", async () => {
  logger.warning("🧹 Running cleanup for expired/used magic links...");

  try {
    const now = new Date();

    const result = await prisma.magicLinkToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { used: true }],
      },
    });

    logger.info(`✅ Cleanup completed: ${result.count} tokens removed`);
  } catch (error) {
    logger.error("❌ Cleanup failed:", error);
  }
});
