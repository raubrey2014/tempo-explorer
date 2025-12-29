import { inngest } from './client'
import { getPublicClient } from '@/lib/blockchain-client'
import { ingestBlock } from '@/lib/ingestion/block-ingestion'

/**
 * Cron job that runs every minute to ingest the latest block
 */
export const ingestLatestBlock = inngest.createFunction(
  { 
    id: 'ingest-latest-block',
    name: 'Ingest Latest Block',
  },
  { 
    cron: '*/5 * * * *', // Every 5 minutes
  },
  async ({ step, logger }) => {
    return await step.run('fetch-and-ingest-latest-block', async () => {
      logger.info('Starting latest block ingestion')
      
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
    })
  }
)

