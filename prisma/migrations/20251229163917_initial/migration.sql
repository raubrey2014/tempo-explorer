-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_hash" TEXT,
    "transaction_index" INTEGER,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "contract_address" TEXT,
    "value" TEXT NOT NULL,
    "input" TEXT NOT NULL DEFAULT '0x',
    "nonce" BIGINT NOT NULL,
    "gas" BIGINT NOT NULL,
    "gas_price" TEXT NOT NULL,
    "gas_used" BIGINT,
    "status" TEXT,
    "timestamp" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_hash_idx" ON "transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_block_number_idx" ON "transactions"("block_number");

-- CreateIndex
CREATE INDEX "transactions_from_idx" ON "transactions"("from");

-- CreateIndex
CREATE INDEX "transactions_to_idx" ON "transactions"("to");

-- CreateIndex
CREATE INDEX "transactions_block_hash_idx" ON "transactions"("block_hash");
