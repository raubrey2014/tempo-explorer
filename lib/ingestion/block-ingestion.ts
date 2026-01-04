import type { PublicClient } from 'viem'
import { getPublicClient } from '@/lib/blockchain-client'
import { ingestTransactions, transformViemTransaction } from './transaction-ingestion'
import { detectAndIngestStablecoins } from './stablecoin-ingestion'
import {
  calculateStablecoinStats,
  updateStablecoinStats,
} from './stablecoin-stats'

export interface IngestBlockOptions {
  blockId: string // Block number (as string) or block hash (0x...)
  client?: PublicClient // Optional client, will use default if not provided
}

export interface IngestBlockResult {
  success: true
  blockNumber: string
  blockHash: string
  transactionsIngested: number
  timestamp: string
}

export interface IngestBlockError {
  error: string
  message?: string
}

/**
 * Ingests all transactions from a block into the database.
 * The ingestion is idempotent - running it multiple times will not create duplicates.
 * 
 * @param options - Options for block ingestion
 * @returns Result object with ingestion details
 * @throws Error if block not found or ingestion fails
 */
export async function ingestBlock(
  options: IngestBlockOptions
): Promise<IngestBlockResult> {
  const client = options.client || getPublicClient()
  const { blockId } = options

  // Parse blockId - could be a number or hash
  let blockNumber: bigint | undefined
  let blockHash: `0x${string}` | undefined

  // Try to parse as number first
  const blockNum = Number(blockId)
  if (!isNaN(blockNum) && blockNum >= 0) {
    blockNumber = BigInt(blockNum)
  } else if (blockId.startsWith('0x')) {
    // Assume it's a block hash
    blockHash = blockId as `0x${string}`
  } else {
    throw new Error('Invalid blockId. Must be a block number or block hash (0x...)')
  }

  // Fetch the block with transactions
  // Note: viem's getBlock only accepts one identifier at a time
  const block = blockNumber
    ? await client.getBlock({
        blockNumber,
        includeTransactions: true,
      })
    : await client.getBlock({
        blockHash: blockHash!,
        includeTransactions: true,
      })

  if (!block) {
    throw new Error('Block not found')
  }

  // Extract transaction hashes from the block
  // Note: When includeTransactions is true, viem returns full transaction objects
  // We need to extract hashes to fetch receipts
  const transactionHashes: `0x${string}`[] = []
  if (block.transactions) {
    for (const tx of block.transactions) {
      if (typeof tx === 'string') {
        // Transaction hash as string
        transactionHashes.push(tx as `0x${string}`)
      } else if (tx && typeof tx === 'object' && 'hash' in tx) {
        // Full transaction object
        transactionHashes.push(tx.hash as `0x${string}`)
      }
    }
  }

  // If no transactions, return early
  if (transactionHashes.length === 0) {
    return {
      success: true,
      blockNumber: block.number?.toString() || '0',
      blockHash: block.hash || '',
      transactionsIngested: 0,
      timestamp: block.timestamp?.toString() || '0',
    }
  }

  // Fetch all transactions and receipts in parallel
  // We fetch transactions again to ensure we have complete data, and receipts for status/gasUsed
  const [transactions, receipts] = await Promise.all([
    Promise.all(
      transactionHashes.map((hash) => client.getTransaction({ hash }))
    ),
    Promise.all(
      transactionHashes.map((hash) =>
        client.getTransactionReceipt({ hash }).catch(() => null)
      )
    ),
  ])

  // Transform and prepare for ingestion
  const transactionsToIngest = transactions.map((tx, index) => {
    const receipt = receipts[index]
    // Type assertion needed because viem Transaction type is a union with different shapes
    return transformViemTransaction(tx as any, receipt, block.timestamp || undefined)
  })

  // Ingest all transactions in a batch (idempotent via upsert)
  await ingestTransactions(transactionsToIngest)

  // Detect and ingest stablecoins from contract addresses in this block
  // Collect contract addresses: contractAddress from receipts (contract creations) and to addresses
  const contractAddresses: string[] = []
  
  for (let i = 0; i < transactionsToIngest.length; i++) {
    const tx = transactionsToIngest[i]
    
    // Add contractAddress if present (contract creation)
    if (tx.contractAddress) {
      contractAddresses.push(tx.contractAddress)
    }
    
    // Add to address (could be a contract call)
    if (tx.to) {
      contractAddresses.push(tx.to)
    }
  }

  // Errors are caught and logged but don't fail block ingestion
  const blockNumberBigInt = block.number || BigInt(0)
  const blockTimestamp = block.timestamp || undefined
  
  if (contractAddresses.length > 0) {
    try {
      await detectAndIngestStablecoins(
        contractAddresses,
        blockNumberBigInt,
        blockTimestamp,
        client
      )
    } catch (error) {
      // Log but don't fail block ingestion if stablecoin detection fails
      console.error('Error detecting stablecoins:', error)
    }
  }

  // Calculate and update stablecoin statistics from transaction receipts
  // Only process if we have receipts
  const validReceipts = receipts.filter((r) => r !== null)
  if (validReceipts.length > 0) {
    try {
      const stats = await calculateStablecoinStats(validReceipts, blockNumberBigInt)
      if (Object.keys(stats).length > 0) {
        await updateStablecoinStats(stats, blockNumberBigInt)
      }
    } catch (error) {
      // Log but don't fail block ingestion if stats calculation fails
      console.error('Error calculating stablecoin stats:', error)
    }
  }

  return {
    success: true,
    blockNumber: block.number?.toString() || '0',
    blockHash: block.hash || '',
    transactionsIngested: transactionsToIngest.length,
    timestamp: block.timestamp?.toString() || '0',
  }
}

