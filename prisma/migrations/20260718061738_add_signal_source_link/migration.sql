-- DropIndex
DROP INDEX "documents_embedding_idx";

-- AlterTable
ALTER TABLE "signals" ADD COLUMN     "publisher" TEXT,
ADD COLUMN     "url" TEXT;
