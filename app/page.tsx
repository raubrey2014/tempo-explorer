'use client'

import { useForm } from '@tanstack/react-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBlockNumber, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { useEffect, useState, useRef } from 'react'

interface Transaction {
  hash: string
  from: string
  to: string | null
  value: bigint
  blockNumber: bigint
  timestamp?: bigint
}

interface BlockData {
  number: bigint
  hash: string
  timestamp: bigint
  transactions: Transaction[]
  totalTransactionCount: number
}

// Live Block Tracker Component
function LiveBlockTracker() {
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now())
  const [blocksPerSecond, setBlocksPerSecond] = useState<number>(0)
  const previousBlockRef = useRef<bigint | null>(null)
  const lastUpdateTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (currentBlock) {
      const now = Date.now()
      const previousBlock = previousBlockRef.current
      const lastUpdate = lastUpdateTimeRef.current
      const timeSinceLastUpdate = (now - lastUpdate) / 1000 // seconds
      
      // Track block updates
      if (previousBlock !== null && currentBlock > previousBlock) {
        // Calculate blocks per second over the last few updates
        if (timeSinceLastUpdate > 0) {
          const newBPS = 1 / timeSinceLastUpdate
          setBlocksPerSecond(prev => {
            // Smooth the average
            return prev === 0 ? newBPS : (prev * 0.7 + newBPS * 0.3)
          })
        }
      }
      
      setLastUpdateTime(now)
      lastUpdateTimeRef.current = now
      previousBlockRef.current = currentBlock
    }
  }, [currentBlock])

  // Update time display every second
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastUpdateTime) / 1000
      setTimeSinceUpdate(elapsed)
    }, 100) // Update every 100ms for smooth display

    return () => clearInterval(interval)
  }, [lastUpdateTime])

  const formatTimeAgo = (seconds: number) => {
    if (seconds < 1) return 'just now'
    if (seconds < 60) return `${Math.floor(seconds)}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-75"></div>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Live
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Current Block
            </div>
            <Link
              href={currentBlock ? `/block/${currentBlock.toString()}` : '#'}
              className="text-3xl font-bold font-mono text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {currentBlock?.toString() || '—'}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Last Update
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formatTimeAgo(timeSinceUpdate)}
            </div>
          </div>
          {blocksPerSecond > 0 && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Blocks/sec
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {blocksPerSecond.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BlockchainStats() {
  const publicClient = usePublicClient()
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const [recentBlocks, setRecentBlocks] = useState<BlockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient || !currentBlock) return

    const fetchRecentBlocks = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch the latest 3 blocks with their top 3 transactions
        const blocksData: BlockData[] = []
        const blocksToFetch = 3
        const blockPromises = []
        
        for (let i = 0; i < blocksToFetch; i++) {
          const blockNum = currentBlock - BigInt(i)
          blockPromises.push(
            publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true })
          )
        }
        
        const blocks = await Promise.all(blockPromises)
        
        for (const fetchedBlock of blocks) {
          const txs: Transaction[] = []
          if (fetchedBlock.transactions) {
            for (const tx of fetchedBlock.transactions) {
              if (typeof tx === 'object') {
                txs.push({
                  hash: tx.hash,
                  from: tx.from || '',
                  to: tx.to || null,
                  value: tx.value || BigInt(0),
                  blockNumber: fetchedBlock.number,
                  timestamp: fetchedBlock.timestamp,
                })
              }
            }
          }
          
          blocksData.push({
            number: fetchedBlock.number,
            hash: fetchedBlock.hash,
            timestamp: fetchedBlock.timestamp,
            transactions: txs.slice(0, 3), // Top 3 transactions per block
            totalTransactionCount: txs.length,
          })
        }
        
        setRecentBlocks(blocksData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch block data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentBlocks()
  }, [publicClient, currentBlock])

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Contract Creation'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  const formatTimestamp = (timestamp: bigint | undefined) => {
    if (!timestamp) return 'N/A'
    const date = new Date(Number(timestamp) * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    
    if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleString()
    }
  }

  return (
    <div className="w-full mt-8 space-y-4">
      {/* Live Block Tracker */}
      <LiveBlockTracker />

      {/* Error Message */}
      {error && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Recent Blocks */}
      {recentBlocks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Recent Blocks
          </h2>
          <div className="space-y-4">
            {recentBlocks.map((block) => (
              <div
                key={block.number.toString()}
                className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Block:</span>{' '}
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {block.number.toString()}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(block.timestamp)}
                    </span>
                    <span className="text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Hash:</span>{' '}
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        {formatHash(block.hash)}
                      </span>
                    </span>
                  </div>
                  <Link
                    href={`/block/${block.number.toString()}`}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    See all {block.totalTransactionCount} →
                  </Link>
                </div>
                {block.transactions.length > 0 ? (
                  <>
                    <div className="space-y-1.5">
                      {block.transactions.map((tx) => (
                        <Link
                          key={tx.hash}
                          href={`/tx/${tx.hash}`}
                          className="block bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="text-gray-500 dark:text-gray-400">Hash:</span>{' '}
                                <span className="font-mono text-gray-900 dark:text-gray-100">
                                  {formatHash(tx.hash)}
                                </span>
                                {' • '}
                                <span className="text-gray-500 dark:text-gray-400">From:</span>{' '}
                                <span className="font-mono">{formatAddress(tx.from)}</span>
                                {tx.to && (
                                  <>
                                    {' → '}
                                    <span className="text-gray-500 dark:text-gray-400">To:</span>{' '}
                                    <span className="font-mono">{formatAddress(tx.to)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span>
                                <span className="text-gray-500 dark:text-gray-400">Value:</span>{' '}
                                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                  {formatEther(tx.value)} ETH
                                </span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="text-center text-gray-400 dark:text-gray-500 text-xs pt-1">
                      ...
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No transactions in this block</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentBlocks.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent blocks found</p>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      txId: '',
    },
    onSubmit: async ({ value }) => {
      if (value.txId.trim()) {
        router.push(`/tx/${value.txId.trim()}`)
      }
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center py-16 px-8 md:px-16 bg-white dark:bg-black">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl font-bold mb-2 text-center">Tempo Explorer</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
            Explore transactions on the Tempo blockchain
          </p>
          
          <div className="w-full max-w-2xl mx-auto">
            <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="w-full"
          >
            <form.Field
              name="txId"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return 'Transaction Hash is required'
                  }
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Transaction Hash
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0xd9a25364caeabbff78d76375940ea744b6472967ace30036cb0f3f9d5fce953e"
                    />
                    <button
                      type="submit"
                      disabled={form.state.isSubmitting}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {form.state.isSubmitting ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            </form>
            
            <div className="mt-4 text-center">
              <Link
                href="/tx/0xd9a25364caeabbff78d76375940ea744b6472967ace30036cb0f3f9d5fce953e"
                className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                Or just see an example
              </Link>
            </div>
          </div>
          
          <BlockchainStats />
        </div>
      </main>
    </div>
  )
}
