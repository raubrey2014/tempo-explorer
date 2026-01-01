-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "raw_transaction" JSONB,
ADD COLUMN "raw_receipt" JSONB;

