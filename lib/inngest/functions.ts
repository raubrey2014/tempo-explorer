import { RetryAfterError } from 'inngest'
import { inngest } from './client'
import { getPublicClient } from '@/lib/blockchain-client'
import { ingestBlock } from '@/lib/ingestion/block-ingestion'
import {
  isRateLimitError,
  getRetryAfterMs,
  calculateExponentialBackoff,
} from './rate-limit'

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

