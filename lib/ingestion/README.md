# Transaction Ingestion Pipeline

This directory contains the infrastructure for ingesting Tempo blockchain transactions into a PostgreSQL database using Prisma and Neon.

## Setup

1. **Configure your Neon database:**
   - Create a Neon database at https://console.neon.tech
   - Copy your database connection string
   - Create a `.env` file in the root directory with:
     ```
     DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
     ```

2. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

3. **Push schema to database:**
   ```bash
   npm run db:push
   ```
   
   Or create a migration:
   ```bash
   npm run db:migrate
   ```

## Usage

### Ingesting a Block

The easiest way to ingest transactions is to ingest an entire block:

```typescript
import { ingestBlock } from '@/lib/ingestion/block-ingestion'

// Ingest a block by number
const result = await ingestBlock({ blockId: '12345' })

// Or by block hash
const result = await ingestBlock({ blockId: '0x1234...' })

console.log(`Ingested ${result.transactionsIngested} transactions from block ${result.blockNumber}`)
```

### Ingesting Individual Transactions

For more granular control, you can ingest individual transactions:

```typescript
import { ingestTransaction, transformViemTransaction } from '@/lib/ingestion/transaction-ingestion'
import { getPublicClient } from '@/lib/blockchain-client'

const client = getPublicClient()

// Example: Ingest a single transaction
const txHash = '0x...'
const transaction = await client.getTransaction({ hash: txHash })
const receipt = await client.getTransactionReceipt({ hash: txHash })
const block = await client.getBlock({ blockNumber: receipt.blockNumber })

const txData = transformViemTransaction(transaction, receipt, block.timestamp)
await ingestTransaction(txData)

// Example: Batch ingest multiple transactions
const transactions = [...]
await ingestTransactions(transactions.map(tx => transformViemTransaction(tx, receipt, timestamp)))
```

## Database Schema

The `Transaction` model includes:
- Transaction identification (hash, nonce)
- Block information (blockNumber, blockHash, transactionIndex)
- Participants (from, to, contractAddress)
- Transaction data (value, input)
- Gas information (gas, gasPrice, gasUsed)
- Status and timestamps

## Next Steps

- Add blocks table for complete block data
- Add indexes for common query patterns
- Implement batch processing for efficient ingestion
- Add error handling and retry logic
- Set up monitoring and logging

