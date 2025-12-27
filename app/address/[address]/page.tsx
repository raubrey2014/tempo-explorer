'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useReadContract, useBlockNumber, usePublicClient } from 'wagmi'
import { formatUnits, formatEther } from 'viem'
import { useEffect, useState } from 'react'

const TOKENS = [
  { name: 'PathUSD', address: '0x20c0000000000000000000000000000000000000' as `0x${string}` },
  { name: 'AlphaUSD', address: '0x20c0000000000000000000000000000000000001' as `0x${string}` },
  { name: 'BetaUSD', address: '0x20c0000000000000000000000000000000000002' as `0x${string}` },
  { name: 'ThetaUSD', address: '0x20c0000000000000000000000000000000000003' as `0x${string}` },
]

// ERC20 ABI for balanceOf, decimals, and symbol
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface TokenBalanceProps {
  tokenAddress: `0x${string}`
  tokenName: string
  userAddress: `0x${string}`
}

function TokenBalance({ tokenAddress, tokenName, userAddress }: TokenBalanceProps) {
  const balance = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  const decimals = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  const symbol = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })

  const isLoading = balance.isLoading || decimals.isLoading || symbol.isLoading
  const isError = balance.isError || decimals.isError || symbol.isError

  const formatValue = (value: bigint | undefined, decimals: number = 18) => {
    if (value === undefined) return 'N/A'
    return formatUnits(value, decimals)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700 dark:text-gray-300">{tokenName}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700 dark:text-gray-300">{tokenName}</span>
          <span className="text-sm text-red-500 dark:text-red-400">
            {balance.error?.message || decimals.error?.message || symbol.error?.message || 'Error loading balance'}
          </span>
        </div>
      </div>
    )
  }

  if (balance.data === undefined || decimals.data === undefined) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {tokenName} {symbol.data && `(${symbol.data})`}
        </span>
        <span className="font-mono text-sm">
          {formatValue(balance.data, Number(decimals.data))} {symbol.data || tokenName}
        </span>
      </div>
    </div>
  )
}

interface Transaction {
  hash: string
  from: string
  to: string | null
  value: bigint
  blockNumber: bigint
  timestamp?: bigint
}

function RecentTransactions({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient()
  const { data: currentBlock } = useBlockNumber()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient || !currentBlock) return

    const fetchRecentTransactions = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const recentTxs: Transaction[] = []
        const blocksToCheck = 20 // Check last 20 blocks
        
        // Generate block numbers to check
        const blockNumbers: bigint[] = []
        for (let i = 0; i < blocksToCheck; i++) {
          blockNumbers.push(currentBlock - BigInt(i))
        }
        
        // Fetch blocks and filter transactions
        const blockDataPromises = blockNumbers.map(blockNum => 
          publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true })
        )
        
        const blocks = await Promise.all(blockDataPromises)
        
        for (const block of blocks) {
          if (block.transactions) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object' && (tx.from?.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase())) {
                recentTxs.push({
                  hash: tx.hash,
                  from: tx.from || '',
                  to: tx.to || null,
                  value: tx.value || BigInt(0),
                  blockNumber: block.number,
                  timestamp: block.timestamp,
                })
              }
            }
          }
        }
        
        // Sort by block number (newest first) and limit to 10
        recentTxs.sort((a, b) => {
          if (a.blockNumber > b.blockNumber) return -1
          if (a.blockNumber < b.blockNumber) return 1
          return 0
        })
        
        setTransactions(recentTxs.slice(0, 10))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentTransactions()
  }, [publicClient, currentBlock, address])

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Contract Creation'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent transactions found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <Link
          key={tx.hash}
          href={`/tx/${tx.hash}`}
          className="block bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all mb-1">
                {tx.hash}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="text-gray-500 dark:text-gray-400">From:</span> {formatAddress(tx.from)}
                {tx.to && (
                  <>
                    {' → '}
                    <span className="text-gray-500 dark:text-gray-400">To:</span> {formatAddress(tx.to)}
                  </>
                )}
              </div>
            </div>
            <div className="ml-4 text-right">
              <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {formatEther(tx.value)} ETH
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Block {tx.blockNumber.toString()}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function AddressPage() {
  const params = useParams()
  const address = params.address as string

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-32 px-16 bg-white dark:bg-black">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-8"
        >
          ← Back to Home
        </Link>
        
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-6">Address Details</h1>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-6">
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all">
                {address}
              </div>
            </div>

            {/* Token Balances */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Token Balances
              </label>
              <div className="space-y-3">
                <TokenBalance
                  tokenAddress={TOKENS[0].address}
                  tokenName={TOKENS[0].name}
                  userAddress={address as `0x${string}`}
                />
                <TokenBalance
                  tokenAddress={TOKENS[1].address}
                  tokenName={TOKENS[1].name}
                  userAddress={address as `0x${string}`}
                />
                <TokenBalance
                  tokenAddress={TOKENS[2].address}
                  tokenName={TOKENS[2].name}
                  userAddress={address as `0x${string}`}
                />
                <TokenBalance
                  tokenAddress={TOKENS[3].address}
                  tokenName={TOKENS[3].name}
                  userAddress={address as `0x${string}`}
                />
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Recent Transactions
              </label>
              <RecentTransactions address={address as `0x${string}`} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

