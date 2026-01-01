import { prisma } from '@/lib/prisma'
import type { Transaction, TransactionReceipt } from 'viem'

/**
 * Serializes an object for JSON storage, converting BigInt values to strings
 */
function serializeForJson(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    })
  )
}

/**
 * Transaction data structure for ingestion
 */
export interface TransactionIngestionData {
  hash: string
  from: string
  to: string | null
  value: bigint
  blockNumber: bigint
  blockHash?: string
  transactionIndex?: number
  nonce: bigint
  input: string
  gas: bigint
  gasPrice: bigint
  gasUsed?: bigint
  status?: 'success' | 'failed'
  contractAddress?: string | null
  timestamp?: bigint
  rawTransaction?: Transaction | null // Raw transaction object from viem
  rawReceipt?: TransactionReceipt | null // Raw receipt object from viem
}

/**
 * Ingests a single transaction into the database
 */
export async function ingestTransaction(
  tx: TransactionIngestionData
): Promise<void> {
  try {
    await prisma.transaction.upsert({
      where: { hash: tx.hash },
      update: {
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash || null,
        transactionIndex: tx.transactionIndex ?? null,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        input: tx.input,
        nonce: tx.nonce,
        gas: tx.gas,
        gasPrice: tx.gasPrice.toString(),
        gasUsed: tx.gasUsed ? BigInt(tx.gasUsed) : null,
        status: tx.status || null,
        contractAddress: tx.contractAddress || null,
        timestamp: tx.timestamp || null,
        rawTransaction: tx.rawTransaction ? serializeForJson(tx.rawTransaction) : null,
        rawReceipt: tx.rawReceipt ? serializeForJson(tx.rawReceipt) : null,
      },
      create: {
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash || null,
        transactionIndex: tx.transactionIndex ?? null,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        input: tx.input,
        nonce: tx.nonce,
        gas: tx.gas,
        gasPrice: tx.gasPrice.toString(),
        gasUsed: tx.gasUsed ? BigInt(tx.gasUsed) : null,
        status: tx.status || null,
        contractAddress: tx.contractAddress || null,
        timestamp: tx.timestamp || null,
        rawTransaction: tx.rawTransaction ? serializeForJson(tx.rawTransaction) : null,
        rawReceipt: tx.rawReceipt ? serializeForJson(tx.rawReceipt) : null,
      },
    })
  } catch (error) {
    console.error(`Error ingesting transaction ${tx.hash}:`, error)
    throw error
  }
}

/**
 * Ingests multiple transactions in a batch
 */
export async function ingestTransactions(
  transactions: TransactionIngestionData[]
): Promise<void> {
  // Use a transaction to ensure all-or-nothing insertion
  await prisma.$transaction(
    transactions.map((tx) =>
      prisma.transaction.upsert({
        where: { hash: tx.hash },
        update: {
          blockNumber: tx.blockNumber,
          blockHash: tx.blockHash || null,
          transactionIndex: tx.transactionIndex ?? null,
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          input: tx.input,
          nonce: tx.nonce,
          gas: tx.gas,
          gasPrice: tx.gasPrice.toString(),
          gasUsed: tx.gasUsed ? BigInt(tx.gasUsed) : null,
          status: tx.status || null,
          contractAddress: tx.contractAddress || null,
          timestamp: tx.timestamp || null,
          rawTransaction: tx.rawTransaction ? serializeForJson(tx.rawTransaction) : null,
          rawReceipt: tx.rawReceipt ? serializeForJson(tx.rawReceipt) : null,
        },
        create: {
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          blockHash: tx.blockHash || null,
          transactionIndex: tx.transactionIndex ?? null,
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          input: tx.input,
          nonce: tx.nonce,
          gas: tx.gas,
          gasPrice: tx.gasPrice.toString(),
          gasUsed: tx.gasUsed ? BigInt(tx.gasUsed) : null,
          status: tx.status || null,
          contractAddress: tx.contractAddress || null,
          timestamp: tx.timestamp || null,
          rawTransaction: tx.rawTransaction ? serializeForJson(tx.rawTransaction) : null,
          rawReceipt: tx.rawReceipt ? serializeForJson(tx.rawReceipt) : null,
        },
      })
    )
  )
}

/**
 * Converts a Viem transaction and receipt to our ingestion format
 * Handles different transaction types (legacy, eip1559, tempo, etc.)
 */
export function transformViemTransaction(
  tx: Transaction,
  receipt?: TransactionReceipt | null,
  blockTimestamp?: bigint
): TransactionIngestionData {
  // Handle different transaction types - Tempo transactions might have input as undefined
  const input = tx.input || '0x'
  const gasPrice = tx.gasPrice || BigInt(0)
  const value = tx.value || BigInt(0)
  const to = tx.to || null
  
  return {
    hash: tx.hash,
    from: tx.from,
    to,
    value,
    blockNumber: receipt?.blockNumber || BigInt(0),
    blockHash: receipt?.blockHash,
    transactionIndex: receipt?.transactionIndex,
    nonce: BigInt(tx.nonce),
    input,
    gas: tx.gas,
    gasPrice,
    gasUsed: receipt?.gasUsed,
    status: receipt?.status === 'success' ? 'success' : receipt?.status === 'reverted' ? 'failed' : undefined,
    contractAddress: receipt?.contractAddress || null,
    timestamp: blockTimestamp,
    rawTransaction: tx || null,
    rawReceipt: receipt || null,
  }
}

