-- CreateTable
CREATE TABLE "stablecoins" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "first_seen_block" BIGINT,
    "first_seen_timestamp" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stablecoins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stablecoins_address_key" ON "stablecoins"("address");

-- CreateIndex
CREATE INDEX "stablecoins_address_idx" ON "stablecoins"("address");

-- CreateIndex
CREATE INDEX "stablecoins_first_seen_block_idx" ON "stablecoins"("first_seen_block");

