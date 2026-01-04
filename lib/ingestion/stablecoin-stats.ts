import { prisma } from '@/lib/prisma'
import type { TransactionReceipt } from 'viem'

/**
 * Transfer event signature (keccak256("Transfer(address,address,uint256)"))
 * This is the first topic in Transfer event logs
 */
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

/**
 * Interface for a log entry in a transaction receipt
 */
interface LogEntry {
  address: string
  topics: string[]
  data: string
}

/**
 * Interface for parsed receipt data
 */
interface ParsedReceipt {
  feeToken?: string | null
  gasUsed?: bigint | null
  effectiveGasPrice?: bigint | null
  logs?: LogEntry[]
}

/**
 * Statistics for a single stablecoin in a block
 */
export interface StablecoinBlockStats {
  address: string
  transferCount: number
  transferVolume: bigint
  feePaymentCount: number
  feeVolume: bigint
}

/**
 * Aggregated statistics for all stablecoins in a block
 */
export interface BlockStablecoinStats {
  [stablecoinAddress: string]: StablecoinBlockStats
}

/**
 * Parses a raw receipt JSON to extract relevant fields
 */
function parseReceipt(rawReceipt: any): ParsedReceipt {
  if (!rawReceipt || typeof rawReceipt !== 'object') {
    return {}
  }

  const parsed: ParsedReceipt = {}

  // Extract feeToken (normalize to lowercase)
  if (rawReceipt.feeToken) {
    parsed.feeToken = typeof rawReceipt.feeToken === 'string' 
      ? rawReceipt.feeToken.toLowerCase() 
      : null
  }

  // Extract gasUsed
  if (rawReceipt.gasUsed !== undefined) {
    parsed.gasUsed = typeof rawReceipt.gasUsed === 'bigint' 
      ? rawReceipt.gasUsed 
      : BigInt(rawReceipt.gasUsed || 0)
  }

  // Extract effectiveGasPrice
  if (rawReceipt.effectiveGasPrice !== undefined) {
    parsed.effectiveGasPrice = typeof rawReceipt.effectiveGasPrice === 'bigint'
      ? rawReceipt.effectiveGasPrice
      : BigInt(rawReceipt.effectiveGasPrice || 0)
  }

  // Extract logs
  if (Array.isArray(rawReceipt.logs)) {
    parsed.logs = rawReceipt.logs.map((log: any) => ({
      address: typeof log.address === 'string' ? log.address.toLowerCase() : '',
      topics: Array.isArray(log.topics) ? log.topics.map((t: any) => String(t)) : [],
      data: typeof log.data === 'string' ? log.data : '0x',
    }))
  }

  return parsed
}

/**
 * Extracts transfer amount from Transfer event log data
 * Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
 * - topics[0] = event signature
 * - topics[1] = from (indexed)
 * - topics[2] = to (indexed)
 * - data = value (uint256, 32 bytes)
 */
function extractTransferAmount(log: LogEntry): bigint | null {
  if (!log.data || log.data === '0x' || log.data.length < 66) {
    return null
  }

  try {
    // Remove '0x' prefix and parse as hex
    const hexData = log.data.slice(2)
    // Transfer amount is in the data field (32 bytes = 64 hex chars)
    const amountHex = hexData.slice(0, 64)
    return BigInt('0x' + amountHex)
  } catch (error) {
    console.error('Error extracting transfer amount from log:', error)
    return null
  }
}

/**
 * Checks if a log is a Transfer event from a known stablecoin
 */
function isTransferEvent(log: LogEntry, stablecoinAddresses: Set<string>): boolean {
  // Check if log address matches a stablecoin
  if (!stablecoinAddresses.has(log.address.toLowerCase())) {
    return false
  }

  // Check if first topic matches Transfer event signature
  if (!log.topics || log.topics.length === 0) {
    return false
  }

  return log.topics[0].toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
}

/**
 * Calculates stablecoin statistics from transaction receipts in a block
 * 
 * @param receipts - Array of raw receipt JSON objects from transactions
 * @param blockNumber - Block number for tracking last activity
 * @returns Aggregated statistics per stablecoin
 */
export async function calculateStablecoinStats(
  receipts: (any | null)[],
  blockNumber: bigint
): Promise<BlockStablecoinStats> {
  // Get all known stablecoin addresses
  const stablecoins = await prisma.stablecoin.findMany({
    select: { address: true },
  })

  const stablecoinAddresses = new Set(
    stablecoins.map((s) => s.address.toLowerCase())
  )

  if (stablecoinAddresses.size === 0) {
    return {}
  }

  const stats: BlockStablecoinStats = {}

  // Initialize stats for all stablecoins
  for (const address of stablecoinAddresses) {
    stats[address] = {
      address,
      transferCount: 0,
      transferVolume: BigInt(0),
      feePaymentCount: 0,
      feeVolume: BigInt(0),
    }
  }

  // Process each receipt
  for (const rawReceipt of receipts) {
    if (!rawReceipt) continue

    const receipt = parseReceipt(rawReceipt)

    // Process Transfer events from logs
    if (receipt.logs) {
      for (const log of receipt.logs) {
        if (isTransferEvent(log, stablecoinAddresses)) {
          const stablecoinAddress = log.address.toLowerCase()
          const amount = extractTransferAmount(log)

          if (amount !== null && stats[stablecoinAddress]) {
            stats[stablecoinAddress].transferCount++
            stats[stablecoinAddress].transferVolume += amount
          }
        }
      }
    }

    // Process fee payments
    if (receipt.feeToken && stablecoinAddresses.has(receipt.feeToken)) {
      const stablecoinAddress = receipt.feeToken
      
      if (stats[stablecoinAddress]) {
        stats[stablecoinAddress].feePaymentCount++

        // Calculate fee amount: gasUsed * effectiveGasPrice
        if (receipt.gasUsed && receipt.effectiveGasPrice) {
          const feeAmount = receipt.gasUsed * receipt.effectiveGasPrice
          stats[stablecoinAddress].feeVolume += feeAmount
        }
      }
    }
  }

  // Remove stablecoins with no activity in this block
  for (const address of Object.keys(stats)) {
    if (
      stats[address].transferCount === 0 &&
      stats[address].feePaymentCount === 0
    ) {
      delete stats[address]
    }
  }

  return stats
}

/**
 * Updates stablecoin statistics in the database
 * Uses atomic operations to avoid race conditions
 * 
 * @param stats - Aggregated statistics per stablecoin for a block
 * @param blockNumber - Block number for lastActivityBlock update
 */
export async function updateStablecoinStats(
  stats: BlockStablecoinStats,
  blockNumber: bigint
): Promise<void> {
  if (Object.keys(stats).length === 0) {
    return
  }

  // Fetch current values for all stablecoins in a single query
  const addresses = Object.keys(stats)
  const currentStats = await prisma.stablecoin.findMany({
    where: { address: { in: addresses } },
    select: {
      address: true,
      transferVolume: true,
      feeVolume: true,
    },
  })

  const currentMap = new Map(
    currentStats.map((s) => [s.address.toLowerCase(), s])
  )

  // Prepare updates with proper string arithmetic for volumes
  const updates = Object.values(stats).map((stat) => {
    const current = currentMap.get(stat.address.toLowerCase())
    const currentTransferVolume = BigInt(current?.transferVolume || '0')
    const currentFeeVolume = BigInt(current?.feeVolume || '0')
    const newTransferVolume = currentTransferVolume + stat.transferVolume
    const newFeeVolume = currentFeeVolume + stat.feeVolume

    return prisma.stablecoin.update({
      where: { address: stat.address },
      data: {
        transferCount: { increment: BigInt(stat.transferCount) },
        transferVolume: newTransferVolume.toString(),
        feePaymentCount: { increment: BigInt(stat.feePaymentCount) },
        feeVolume: newFeeVolume.toString(),
        lastActivityBlock: blockNumber,
      },
    })
  })

  // Execute all updates in a single transaction
  await prisma.$transaction(updates)
}

