import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
  transactionOptions: {
    maxWait: 10000,
    timeout: 10000,
  },
});

export default prisma;
