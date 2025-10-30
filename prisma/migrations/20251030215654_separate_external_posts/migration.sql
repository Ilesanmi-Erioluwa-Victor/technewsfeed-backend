/*
  Warnings:

  - You are about to drop the `News` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SourceCategoryMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_NewsCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_NewsTags` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."News" DROP CONSTRAINT "News_sourceRefId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SourceCategoryMapping" DROP CONSTRAINT "SourceCategoryMapping_canonicalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_NewsCategories" DROP CONSTRAINT "_NewsCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_NewsCategories" DROP CONSTRAINT "_NewsCategories_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_NewsTags" DROP CONSTRAINT "_NewsTags_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_NewsTags" DROP CONSTRAINT "_NewsTags_B_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "slug" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."News";

-- DropTable
DROP TABLE "public"."SourceCategoryMapping";

-- DropTable
DROP TABLE "public"."_NewsCategories";

-- DropTable
DROP TABLE "public"."_NewsTags";

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "excerpt" TEXT,
    "authorName" TEXT,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPost" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "link" TEXT NOT NULL,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "blogPostId" INTEGER,
    "sourceRefId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BlogPostCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BlogPostCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BlogPostTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BlogPostTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPost_link_key" ON "ExternalPost"("link");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPost_sourceUrl_key" ON "ExternalPost"("sourceUrl");

-- CreateIndex
CREATE INDEX "_BlogPostCategories_B_index" ON "_BlogPostCategories"("B");

-- CreateIndex
CREATE INDEX "_BlogPostTags_B_index" ON "_BlogPostTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPost" ADD CONSTRAINT "ExternalPost_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPost" ADD CONSTRAINT "ExternalPost_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "NewsSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostCategories" ADD CONSTRAINT "_BlogPostCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostCategories" ADD CONSTRAINT "_BlogPostCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostTags" ADD CONSTRAINT "_BlogPostTags_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostTags" ADD CONSTRAINT "_BlogPostTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
