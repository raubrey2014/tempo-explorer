import type { PublicClient, Address } from 'viem'
import { prisma } from '@/lib/prisma'
import { getPublicClient } from '@/lib/blockchain-client'

/**
 * Standard TIP-20 (ERC-20) ABI for detection
 * These are the minimum required functions to identify a TIP-20 token
 */
const TIP20_DETECTION_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

/**
 * StablecoinIngestion handles detection and ingestion of TIP-20 stablecoin contracts
 */
export class StablecoinIngestion {
  private client: PublicClient

  constructor(client?: PublicClient) {
    this.client = client || getPublicClient()
  }

  /**
   * Checks if an address is already in the stablecoins table
   */
  private async isAlreadyKnown(address: string): Promise<boolean> {
    const existing = await prisma.stablecoin.findUnique({
      where: { address: address.toLowerCase() },
    })
    return !!existing
  }

  /**
   * Checks if an address is a contract (has bytecode)
   */
  private async isContract(address: Address): Promise<boolean> {
    try {
      const code = await this.client.getCode({ address })
      if (!code || code === '0x') return false
      
      // Check if it has meaningful bytecode (at least 3 bytes)
      const bytecodeLength = (code.length - 2) / 2 // Remove '0x' prefix, divide by 2 for hex
      return bytecodeLength >= 3
    } catch (error) {
      // If we can't get code, assume it's not a contract
      return false
    }
  }

  /**
   * Detects if an address implements TIP-20 token standard
   * Checks for standard functions: decimals(), symbol(), totalSupply()
   */
  private async isTIP20Token(address: Address): Promise<boolean> {
    try {
      // Try to call standard TIP-20 functions
      // We'll check decimals, symbol, and totalSupply
      // If any fail, it's likely not a TIP-20 token
      const [decimals, symbol, totalSupply] = await Promise.all([
        this.client.readContract({
          address,
          abi: TIP20_DETECTION_ABI,
          functionName: 'decimals',
        }).catch(() => null),
        this.client.readContract({
          address,
          abi: TIP20_DETECTION_ABI,
          functionName: 'symbol',
        }).catch(() => null),
        this.client.readContract({
          address,
          abi: TIP20_DETECTION_ABI,
          functionName: 'totalSupply',
        }).catch(() => null),
      ])

      // All three functions should succeed for a valid TIP-20 token
      return decimals !== null && symbol !== null && totalSupply !== null
    } catch (error) {
      // If any error occurs, it's not a TIP-20 token
      return false
    }
  }

  /**
   * Ingests a stablecoin address into the database
   * Only creates if it doesn't exist (preserves first seen block)
   */
  private async ingestStablecoin(
    address: string,
    blockNumber: bigint,
    blockTimestamp?: bigint
  ): Promise<void> {
    try {
      // Use create with skipDuplicates to only add if not already present
      // This preserves the firstSeenBlock from the original detection
      await prisma.stablecoin.create({
        data: {
          address: address.toLowerCase(),
          firstSeenBlock: blockNumber,
          firstSeenTimestamp: blockTimestamp || null,
        },
      })
    } catch (error: any) {
      // Ignore unique constraint errors (already exists)
      if (error?.code === 'P2002') {
        // Address already exists, which is fine
        return
      }
      console.error(`Error ingesting stablecoin ${address}:`, error)
      throw error
    }
  }

  /**
   * Checks a single address and ingests if it's a TIP-20 token we haven't seen
   * @returns true if a new stablecoin was ingested, false otherwise
   */
  async checkAndIngestAddress(
    address: string,
    blockNumber: bigint,
    blockTimestamp?: bigint
  ): Promise<boolean> {
    // Normalize address
    const normalizedAddress = address.toLowerCase()

    // Skip zero address
    if (normalizedAddress === '0x0000000000000000000000000000000000000000') {
      return false
    }

    // Check if we already know about this address
    if (await this.isAlreadyKnown(normalizedAddress)) {
      return false
    }

    // Check if it's a contract
    if (!(await this.isContract(normalizedAddress as Address))) {
      return false
    }

    // Check if it's a TIP-20 token
    if (!(await this.isTIP20Token(normalizedAddress as Address))) {
      return false
    }

    // It's a TIP-20 token we haven't seen - ingest it
    await this.ingestStablecoin(normalizedAddress, blockNumber, blockTimestamp)
    return true
  }

  /**
   * Checks multiple addresses and ingests any new TIP-20 tokens found
   * @param addresses Array of addresses to check
   * @param blockNumber Block number where these addresses were seen
   * @param blockTimestamp Block timestamp
   * @returns Number of new stablecoins ingested
   */
  async checkAndIngestAddresses(
    addresses: string[],
    blockNumber: bigint,
    blockTimestamp?: bigint
  ): Promise<number> {
    // Remove duplicates and normalize
    const uniqueAddresses = Array.from(
      new Set(addresses.map((addr) => addr.toLowerCase()))
    ).filter((addr) => addr !== '0x0000000000000000000000000000000000000000')

    if (uniqueAddresses.length === 0) {
      return 0
    }

    let ingestedCount = 0

    // Process addresses in parallel batches to avoid overwhelming the RPC
    const batchSize = 10
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
      const batch = uniqueAddresses.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map((addr) =>
          this.checkAndIngestAddress(addr, blockNumber, blockTimestamp)
        )
      )

      // Count successful ingestions
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value === true) {
          ingestedCount++
        }
      }
    }

    return ingestedCount
  }
}

/**
 * Convenience function to check and ingest addresses from transactions
 */
export async function detectAndIngestStablecoins(
  addresses: string[],
  blockNumber: bigint,
  blockTimestamp?: bigint,
  client?: PublicClient
): Promise<number> {
  const ingestion = new StablecoinIngestion(client)
  return ingestion.checkAndIngestAddresses(addresses, blockNumber, blockTimestamp)
}

