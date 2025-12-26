import { PrismaClient } from "@/generated/prisma";
import config from "@/prisma.config";

const prisma = new PrismaClient({
  ...config,
  log: ["query", "error", "warn"],
  transactionOptions: {
    maxWait: 10000,
    timeout: 10000,
  },
});

export default prisma;
