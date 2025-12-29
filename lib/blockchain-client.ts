import { createPublicClient, http } from 'viem'
import { tempoTestnet } from 'viem/chains'

/**
 * Creates a public client for server-side blockchain interactions
 * Uses the default RPC endpoint for Tempo testnet
 */
export function createBlockchainClient() {
  const rpcUrl = process.env.TEMPO_RPC_URL || 'https://rpc.testnet.tempo.xyz'
  
  return createPublicClient({
    chain: tempoTestnet,
    transport: http(rpcUrl),
  })
}

/**
 * Singleton instance of the public client
 */
let publicClientInstance: ReturnType<typeof createBlockchainClient> | null = null

/**
 * Gets or creates the public client instance
 */
export function getPublicClient() {
  if (!publicClientInstance) {
    publicClientInstance = createBlockchainClient()
  }
  return publicClientInstance
}

