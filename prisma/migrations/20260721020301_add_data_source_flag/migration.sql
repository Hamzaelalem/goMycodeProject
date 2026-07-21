-- AlterTable
ALTER TABLE "esg_sector_inputs" ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'mock';

-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'mock';

-- AlterTable
ALTER TABLE "risk_factor_scores" ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'mock';

-- AlterTable
ALTER TABLE "signals" ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'mock';
