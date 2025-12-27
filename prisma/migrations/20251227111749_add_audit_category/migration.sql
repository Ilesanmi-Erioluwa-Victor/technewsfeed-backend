/*
  Warnings:

  - You are about to drop the column `ipHash` on the `AuditLog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditCategoryEnum" AS ENUM ('AUTHENTICATION', 'PROFILE', 'SECURITY', 'ACCOUNT', 'CONTENT', 'MODERATION', 'SYSTEM', 'ADMIN', 'BILLING', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "ipHash",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "severity" TEXT DEFAULT 'INFO',
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "AuditCategory" (
    "id" TEXT NOT NULL,
    "name" "AuditCategoryEnum" NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT '#6b7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditCategory_name_key" ON "AuditCategory"("name");

-- CreateIndex
CREATE INDEX "AuditCategory_name_idx" ON "AuditCategory"("name");

-- CreateIndex
CREATE INDEX "AuditCategory_isActive_idx" ON "AuditCategory"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_categoryId_idx" ON "AuditLog"("categoryId");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AuditCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
