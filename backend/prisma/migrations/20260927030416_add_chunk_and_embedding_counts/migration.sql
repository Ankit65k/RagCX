-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "embeddingCount" INTEGER NOT NULL DEFAULT 0;
