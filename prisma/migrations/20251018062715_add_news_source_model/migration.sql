/*
  Warnings:

  - The `tags` column on the `News` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "public"."News_category_idx";

-- DropIndex
DROP INDEX "public"."News_source_idx";

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "sourceRefId" INTEGER,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_name_key" ON "NewsSource"("name");

-- CreateIndex
CREATE INDEX "News_source_category_idx" ON "News"("source", "category");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "NewsSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
