import { RetryAfterError } from 'inngest'
import { inngest } from './client'
import { getPublicClient } from '@/lib/blockchain-client'
import { ingestBlock } from '@/lib/ingestion/block-ingestion'
import {
  isRateLimitError,
  getRetryAfterMs,
  calculateExponentialBackoff,
} from './rate-limit'
import { prisma } from '@/lib/prisma'

/**
 * Cron job that runs every 5 minutes to ingest the latest block
 * Includes rate limit handling with exponential backoff
 */
export const ingestLatestBlock = inngest.createFunction(
  { 
    id: 'ingest-latest-block',
    name: 'Ingest Latest Block',
    retries: 5, // Allow up to 5 retries with exponential backoff
  },
  { 
    cron: '*/5 * * * *', // Every 5 minutes
  },
  async ({ step, logger, attempt }) => {
    return await step.run('fetch-and-ingest-latest-block', async () => {
      logger.info('Starting latest block ingestion', { attempt })

      try {
        const client = getPublicClient()
        
        // Get the latest block number
        const latestBlockNumber = await client.getBlockNumber()
        logger.info(`Latest block number: ${latestBlockNumber}`)
        
        // Ingest the latest block
        const result = await ingestBlock({ 
          blockId: latestBlockNumber.toString() 
        })
        
        logger.info(`Successfully ingested block ${result.blockNumber} with ${result.transactionsIngested} transactions`)
        
        return {
          success: true,
          blockNumber: result.blockNumber,
          blockHash: result.blockHash,
          transactionsIngested: result.transactionsIngested,
          timestamp: result.timestamp,
        }
      } catch (error) {
        // Check if this is a rate limit error
        if (isRateLimitError(error)) {
          logger.warn('Rate limit detected, scheduling retry', { 
            error: error instanceof Error ? error.message : String(error),
            attempt,
          })

          // Try to get retry-after from the error, otherwise use exponential backoff
          const retryAfterMs = getRetryAfterMs(error) ?? calculateExponentialBackoff(attempt)

          logger.info(`Retrying after ${retryAfterMs}ms (${Math.round(retryAfterMs / 1000)}s)`)
          
          // Throw RetryAfterError to tell Inngest to retry after the specified delay
          throw new RetryAfterError(
            `Rate limit exceeded. Retrying after ${Math.round(retryAfterMs / 1000)}s`,
            retryAfterMs // milliseconds
          )
        }

        // For non-rate-limit errors, re-throw to let Inngest handle normally
        logger.error('Block ingestion failed with non-rate-limit error', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        })
        throw error
      }
    })
  }
)

/**
 * Cron job that runs hourly to clean up expired transactions based on TTL
 * Deletes transactions older than the configured TTL duration (default: 7 days)
 * based on the block timestamp field
 */
export const cleanupExpiredTransactions = inngest.createFunction(
  {
    id: 'cleanup-expired-transactions',
    name: 'Cleanup Expired Transactions',
    retries: 3, // Allow up to 3 retries
  },
  {
    cron: '0 * * * *', // Every hour at minute 0
  },
  async ({ step, logger }) => {
    return await step.run('cleanup-expired-transactions', async () => {
      // Get TTL duration from environment variable (default: 3 days)
      const ttlDays = parseInt(process.env.TRANSACTION_TTL_DAYS || '3', 10)
      
      if (ttlDays <= 0) {
        logger.warn('TRANSACTION_TTL_DAYS is set to 0 or negative, skipping cleanup')
        return { success: false, reason: 'TTL disabled' }
      }

      logger.info(`Starting transaction cleanup with TTL of ${ttlDays} days`)

      try {
        // Calculate the cutoff timestamp (current time - TTL days)
        const now = Date.now()
        const cutoffDate = new Date(now - ttlDays * 24 * 60 * 60 * 1000)
        // Convert to Unix timestamp in seconds (BigInt)
        const cutoffTimestamp = BigInt(Math.floor(cutoffDate.getTime() / 1000))

        logger.info(`Cutoff timestamp: ${cutoffTimestamp} (${cutoffDate.toISOString()})`)

        // Count how many transactions will be deleted (for logging)
        const countToDelete = await prisma.transaction.count({
          where: {
            timestamp: {
              not: null,
              lt: cutoffTimestamp,
            },
          },
        })

        logger.info(`Found ${countToDelete} transactions to delete`)

        if (countToDelete === 0) {
          logger.info('No expired transactions to clean up')
          return {
            success: true,
            deletedCount: 0,
            ttlDays,
            cutoffTimestamp: cutoffTimestamp.toString(),
          }
        }

        // Delete in batches to avoid large transactions
        const batchSize = 1000
        let totalDeleted = 0
        let hasMore = true

        while (hasMore) {
          // Find IDs of transactions to delete in this batch
          const transactionsToDelete = await prisma.transaction.findMany({
            where: {
              timestamp: {
                not: null,
                lt: cutoffTimestamp,
              },
            },
            select: {
              id: true,
            },
            take: batchSize,
          })

          if (transactionsToDelete.length === 0) {
            hasMore = false
            break
          }

          // Delete the batch by IDs
          const deleteResult = await prisma.transaction.deleteMany({
            where: {
              id: {
                in: transactionsToDelete.map((t) => t.id),
              },
            },
          })

          const deletedInBatch = deleteResult.count
          totalDeleted += deletedInBatch

          logger.info(`Deleted batch: ${deletedInBatch} transactions (total: ${totalDeleted}/${countToDelete})`)

          // If we got fewer than the batch size, we're done
          if (transactionsToDelete.length < batchSize) {
            hasMore = false
          }
        }

        logger.info(`Successfully cleaned up ${totalDeleted} expired transactions`)

        return {
          success: true,
          deletedCount: totalDeleted,
          ttlDays,
          cutoffTimestamp: cutoffTimestamp.toString(),
          cutoffDate: cutoffDate.toISOString(),
        }
      } catch (error) {
        logger.error('Transaction cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    })
  }
)

