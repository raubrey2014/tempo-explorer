-- AlterTable
ALTER TABLE "stablecoins" ADD COLUMN "transfer_count" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "transfer_volume" TEXT NOT NULL DEFAULT '0',
ADD COLUMN "fee_payment_count" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "fee_volume" TEXT NOT NULL DEFAULT '0',
ADD COLUMN "last_activity_block" BIGINT;

-- CreateIndex
CREATE INDEX "stablecoins_last_activity_block_idx" ON "stablecoins"("last_activity_block");

