import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

export default prisma;
