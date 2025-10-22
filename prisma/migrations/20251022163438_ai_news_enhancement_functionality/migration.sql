-- CreateTable
CREATE TABLE "SourceCategoryMapping" (
    "id" SERIAL NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceCat" TEXT NOT NULL,
    "canonicalId" INTEGER NOT NULL,

    CONSTRAINT "SourceCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceCategoryMapping_sourceName_sourceCat_key" ON "SourceCategoryMapping"("sourceName", "sourceCat");

-- AddForeignKey
ALTER TABLE "SourceCategoryMapping" ADD CONSTRAINT "SourceCategoryMapping_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
