'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePublicClient } from 'wagmi'
import { formatUnits, formatEther } from 'viem'
import { useEffect, useState } from 'react'

interface BlockField {
  label: string
  value: string | React.ReactNode
  explanation: string
}

export default function BlockPage() {
  const params = useParams()
  const blockId = params.blockId as string
  const publicClient = usePublicClient()
  const [block, setBlock] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient) return

    const fetchBlock = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Try to parse as block number first, otherwise treat as hash
        const isBlockNumber = blockId.match(/^\d+$/)
        
        const fetchedBlock = await publicClient.getBlock({
          ...(isBlockNumber 
            ? { blockNumber: BigInt(blockId) }
            : { blockHash: blockId as `0x${string}` }
          ),
          includeTransactions: true,
        })
        setBlock(fetchedBlock)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch block')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlock()
  }, [publicClient, blockId])

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatHash = (hash: string | undefined) => {
    if (!hash) return 'N/A'
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  const formatTimestamp = (timestamp: bigint | undefined) => {
    if (timestamp === undefined) return 'N/A'
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const formatGas = (gas: bigint | undefined) => {
    if (gas === undefined) return 'N/A'
    return gas.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Categorize transactions into Tempo sections
  const categorizeTransactions = (transactions: any[]) => {
    if (!transactions || transactions.length === 0) {
      return {
        startOfBlock: [],
        proposerLane: [],
        paymentLane: [],
        endOfBlock: [],
      }
    }

    const PAYMENT_PREFIX = '0x20c0000000000000000000000000'
    const totalTxs = transactions.length
    
    // Heuristic: First transaction is start-of-block system transaction (Rewards Registry)
    const START_OF_BLOCK_COUNT = 1
    
    // Heuristic: Last few transactions are end-of-block system transactions
    // (Fee Manager, Stablecoin DEX, Subblock Metadata) - typically last 3, but ensure we have room for middle transactions
    const END_OF_BLOCK_COUNT = totalTxs <= 4 
      ? Math.max(0, totalTxs - START_OF_BLOCK_COUNT - 1) // Leave at least 1 middle transaction if possible
      : Math.min(3, totalTxs - START_OF_BLOCK_COUNT) // Otherwise, last 3 (excluding the first)
    
    const startOfBlock: any[] = []
    const proposerLane: any[] = []
    const paymentLane: any[] = []
    const endOfBlock: any[] = []
    
    transactions.forEach((tx, index) => {
      const txObj = typeof tx === 'object' ? tx : null
      
      // Start-of-block system transactions (first transaction - Rewards Registry)
      if (index < START_OF_BLOCK_COUNT) {
        startOfBlock.push({ tx, index, type: 'start-of-block' })
      }
      // End-of-block system transactions (last transactions - Fee Manager, Stablecoin DEX, Subblock Metadata)
      else if (index >= totalTxs - END_OF_BLOCK_COUNT && END_OF_BLOCK_COUNT > 0) {
        endOfBlock.push({ tx, index, type: 'end-of-block' })
      }
      // Middle transactions - categorize by payment prefix
      else if (txObj && txObj.to) {
        const toAddress = txObj.to.toLowerCase()
        // Payment transactions identified by TIP-20 prefix (0x20c0000000000000000000000000...)
        if (toAddress.startsWith(PAYMENT_PREFIX.toLowerCase())) {
          paymentLane.push({ tx, index, type: 'payment' })
        } else {
          // Regular user transactions (proposer lane - subject to general_gas_limit)
          proposerLane.push({ tx, index, type: 'proposer-lane' })
        }
      } else {
        // Contract creation or unknown type - treat as proposer lane
        proposerLane.push({ tx, index, type: 'proposer-lane' })
      }
    })
    
    return {
      startOfBlock,
      proposerLane,
      paymentLane,
      endOfBlock,
    }
  }

  // Build field sections based on Tempo documentation
  interface BlockFieldSection {
    title: string
    fields: BlockField[]
  }

  const getBlockFieldSections = (): BlockFieldSection[] => {
    if (!block) return []

    return [
      {
        title: 'Overview',
        fields: [
          {
            label: 'Block Number',
            value: block.number?.toString() || 'N/A',
            explanation: 'The sequential number of this block in the blockchain. In Tempo, as in Ethereum, each block has a unique number that increases by one for each subsequent block. This number is used to identify and order blocks chronologically.',
          },
          {
            label: 'Block Hash',
            value: block.hash ? (
              <span className="font-mono break-all">{block.hash}</span>
            ) : 'N/A',
            explanation: 'The cryptographic hash of this block\'s header, uniquely identifying the block. This hash is computed from all the block header fields and serves as a unique fingerprint. Like Ethereum, Tempo uses Keccak-256 hashing to generate block hashes, ensuring immutability and integrity of the blockchain.',
          },
          {
            label: 'Parent Hash',
            value: block.parentHash ? (
              <Link
                href={`/block/${block.parentHash}`}
                className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
              >
                {block.parentHash}
              </Link>
            ) : 'N/A',
            explanation: 'The hash of the previous block in the blockchain, creating a cryptographic link to the parent block. This field is identical to Ethereum\'s parentHash and forms the chain structure by linking each block to its predecessor, ensuring the sequential ordering and integrity of the blockchain.',
          },
          {
            label: 'Timestamp',
            value: formatTimestamp(block.timestamp),
            explanation: 'The Unix timestamp (in seconds) when this block was proposed. In Tempo, as documented, the block header also includes a `timestamp_millis_part` field for millisecond precision, providing higher temporal resolution than Ethereum\'s second-level precision. The full timestamp is calculated as `inner.timestamp * 1000 + timestamp_millis_part`. This enhanced precision is particularly useful for Tempo\'s high-frequency payment processing.',
          },
          {
            label: 'Miner / Proposer',
            value: block.miner ? (
              <Link
                href={`/address/${block.miner}`}
                className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
              >
                {block.miner}
              </Link>
            ) : 'N/A',
            explanation: 'The address of the account that proposed (mined) this block. In Tempo, as in Ethereum post-merge, this is the validator address responsible for creating and proposing the block. The proposer receives transaction fees and block rewards for their role in securing the network.',
          },
        ],
      },
      {
        title: 'Chain & State',
        fields: [
          {
            label: 'State Root',
            value: block.stateRoot ? (
              <span className="font-mono break-all">{formatHash(block.stateRoot)}</span>
            ) : 'N/A',
            explanation: 'The root hash of the state Merkle trie after all transactions in this block have been executed. This field is identical to Ethereum\'s stateRoot and represents a cryptographic commitment to the entire system state (account balances, contract storage, etc.) at the point when this block was finalized. Any change to the state would result in a different state root hash.',
          },
          {
            label: 'Transactions Root',
            value: block.transactionsRoot ? (
              <span className="font-mono break-all">{formatHash(block.transactionsRoot)}</span>
            ) : 'N/A',
            explanation: 'The root hash of the Merkle trie containing all transactions in this block. Like Ethereum, this field provides a cryptographic commitment to the exact set of transactions included in the block, allowing efficient verification that a specific transaction is included without needing to download the entire block.',
          },
          {
            label: 'Receipts Root',
            value: block.receiptsRoot ? (
              <span className="font-mono break-all">{formatHash(block.receiptsRoot)}</span>
            ) : 'N/A',
            explanation: 'The root hash of the Merkle trie containing all transaction receipts for transactions in this block. This field is identical to Ethereum\'s receiptsRoot and provides a cryptographic commitment to transaction execution results, including gas usage, logs, and status codes.',
          },
        ],
      },
      {
        title: 'Gas',
        fields: [
          {
            label: 'Gas Limit',
            value: formatGas(block.gasLimit),
            explanation: 'The maximum amount of gas allowed for all transactions in this block. In Ethereum, this is a single value applying to all transactions. However, Tempo extends this concept by partitioning gas allocation: `general_gas_limit` for standard transactions and `shared_gas_limit` for payment lane and sub-block transactions. This partitioning allows Tempo to ensure payment transactions have dedicated block space even during high network congestion.',
          },
          {
            label: 'Gas Used',
            value: formatGas(block.gasUsed),
            explanation: 'The total amount of gas consumed by all transactions executed in this block. Like Ethereum, this represents the computational resources used to process all transactions. In Tempo, this includes both general transactions and shared transactions (payment lanes, sub-blocks), with the latter managed by the `shared_gas_limit` partitioning.',
          },
          {
            label: 'Base Fee Per Gas',
            value: block.baseFeePerGas ? (
              `${formatUnits(block.baseFeePerGas, 9)} Gwei`
            ) : 'N/A',
            explanation: 'The base fee per unit of gas, introduced in Ethereum\'s EIP-1559. This fee is burned (removed from circulation) rather than paid to miners/validators. Tempo maintains compatibility with Ethereum\'s fee model, including the base fee mechanism for managing network congestion through dynamic fee adjustments.',
          },
        ],
      },
      {
        title: 'Technical Details',
        fields: [
          {
            label: 'Difficulty',
            value: block.difficulty?.toString() || 'N/A',
            explanation: 'A legacy field from Ethereum\'s proof-of-work mechanism, representing the mining difficulty. In Tempo, as in Ethereum post-merge (proof-of-stake), this field is typically zero or set to a constant value since difficulty-based mining is no longer used. The value is maintained for compatibility with Ethereum\'s block structure.',
          },
          {
            label: 'Extra Data',
            value: block.extraData ? (
              <span className="font-mono text-xs break-all">{block.extraData}</span>
            ) : 'N/A',
            explanation: 'An optional field allowing proposers to include arbitrary data in the block header. Like Ethereum, this field can be used by proposers to include messages or other data, though in practice it is typically minimal. In Tempo, this field maintains the same structure and purpose as Ethereum.',
          },
        ],
      },
    ]
  }

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
          <h1 className="text-3xl font-bold mb-6">Block Details</h1>
          
          {isLoading && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">Loading block details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading block</p>
              <p className="text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {!isLoading && !error && block && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-8">
              {/* Block Fields with Explanations - Organized by Sections */}
              {getBlockFieldSections().map((section, sectionIndex) => (
                <div key={sectionIndex} className="border-b border-gray-200 dark:border-gray-700 pb-8 last:border-b-0 last:pb-0">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {field.label}
                        </label>
                        <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all mb-2">
                          {field.value}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {field.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Transaction Count Summary */}
              {block.transactions && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Transactions
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Count
                    </label>
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 mb-2">
                      {block.transactions.length.toString()}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      The number of transactions included in this block. In Tempo, blocks contain user transactions as well as system transactions: start-of-block system transactions (beginning with the Rewards Registry call), proposer lane transactions, sub-block transactions, gas incentive transactions, and end-of-block system transactions (Fee Manager, Stablecoin DEX, Subblock Metadata). This structure extends Ethereum's block body to support Tempo's payment-focused features.
                    </p>
                  </div>
                </div>
              )}

              {/* Transactions List */}
              {block.transactions && block.transactions.length > 0 && (() => {
                const categorized = categorizeTransactions(block.transactions)
                
                const renderTransactionSection = (
                  title: string,
                  transactions: Array<{ tx: any; index: number; type: string }>,
                  description: string
                ) => {
                  if (transactions.length === 0) return null
                  
                  return (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {title}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                        {description}
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {transactions.map(({ tx, index }) => {
                          const txHash = typeof tx === 'string' ? tx : tx.hash
                          return (
                            <Link
                              key={index}
                              href={`/tx/${txHash}`}
                              className="block bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                      #{index}
                                    </span>
                                    <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                                      {txHash}
                                    </div>
                                  </div>
                                  {typeof tx === 'object' && (
                                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                      <span className="text-gray-500 dark:text-gray-400">From:</span>{' '}
                                      {formatAddress(tx.from)}
                                      {tx.to && (
                                        <>
                                          {' → '}
                                          <span className="text-gray-500 dark:text-gray-400">To:</span>{' '}
                                          {formatAddress(tx.to)}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {typeof tx === 'object' && tx.value !== undefined && (
                                  <div className="ml-4 text-right">
                                    <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                                      {formatEther(tx.value)} ETH
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Transactions ({block.transactions.length})
                    </label>
                    
                    {renderTransactionSection(
                      'Start-of-Block System Transactions',
                      categorized.startOfBlock,
                      'These mandatory system transactions initiate the block. The first transaction is the Rewards Registry call, which refreshes validator rewards metadata before user transactions begin. Unlike Ethereum, Tempo requires these system transactions to manage protocol-level operations and ensure proper state initialization.'
                    )}
                    
                    {renderTransactionSection(
                      'Proposer Lane Transactions',
                      categorized.proposerLane,
                      'Standard user transactions selected by the block proposer, subject to the `general_gas_limit`. These are typically non-payment transactions like smart contract interactions. In Ethereum, all transactions compete equally, but Tempo partitions gas allocation to ensure payment transactions have dedicated space via the `shared_gas_limit`.'
                    )}
                    
                    {renderTransactionSection(
                      'Payment Lane Transactions',
                      categorized.paymentLane,
                      'Transactions sent to TIP-20 payment addresses (prefixed with `0x20c0000000000000000000000000`). These transactions use the `shared_gas_limit` and are guaranteed blockspace even during network congestion. This dedicated lane ensures low and predictable fees for payment transactions, a key Tempo enhancement over Ethereum where all transactions compete in a single pool.'
                    )}
                    
                    {renderTransactionSection(
                      'End-of-Block System Transactions',
                      categorized.endOfBlock,
                      'Mandatory system transactions that finalize the block. These include: Fee Manager (settles block fee accounting), Stablecoin DEX (settles stablecoin exchange balances), and Subblock Metadata (contains metadata about sub-blocks). These transactions ensure proper protocol finalization and state settlement, functionality not present in Ethereum\'s standard block structure.'
                    )}
                  </div>
                )
              })()}

              {(!block.transactions || block.transactions.length === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transactions
                  </label>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No transactions in this block</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

