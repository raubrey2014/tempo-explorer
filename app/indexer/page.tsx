import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatEther } from 'viem'

export const dynamic = 'force-dynamic' // Ensure fresh data on each request

interface TransactionDisplay {
  hash: string
  from: string
  to: string | null
  value: string
  blockNumber: string
  blockHash: string | null
  transactionIndex: number | null
  status: string | null
  gasUsed: string | null
  timestamp: string | null
  createdAt: Date
}

export default async function IndexerPage() {
  // Fetch the most recent 50 transactions
  const transactions = await prisma.transaction.findMany({
    take: 50,
    orderBy: {
      blockNumber: 'desc',
    },
    select: {
      hash: true,
      from: true,
      to: true,
      value: true,
      blockNumber: true,
      blockHash: true,
      transactionIndex: true,
      status: true,
      gasUsed: true,
      timestamp: true,
      createdAt: true,
    },
  })

  // Transform for display
  const displayTransactions: TransactionDisplay[] = transactions.map((tx) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    blockNumber: tx.blockNumber.toString(),
    blockHash: tx.blockHash,
    transactionIndex: tx.transactionIndex,
    status: tx.status,
    gasUsed: tx.gasUsed ? tx.gasUsed.toString() : null,
    timestamp: tx.timestamp ? tx.timestamp.toString() : null,
    createdAt: tx.createdAt,
  }))

  // Get total count for stats
  const totalCount = await prisma.transaction.count()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-6xl flex-col py-16 px-8 md:px-16 bg-white dark:bg-black">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-8"
        >
          ← Back to Home
        </Link>

        <div className="w-full">
          <h1 className="text-3xl font-bold mb-2">Indexer Test Page</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Transactions from the database ({totalCount.toLocaleString()} total)
          </p>

          {displayTransactions.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">
                No transactions found in the database. Try ingesting a block first.
              </p>
              <Link
                href="/api/ingest/1"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-4 inline-block"
              >
                Test: Ingest block 1 →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Transactions:</span>
                    <span className="ml-2 font-semibold">{totalCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Showing:</span>
                    <span className="ml-2 font-semibold">{displayTransactions.length}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Hash
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Block
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          From
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Value (ETH)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Gas Used
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {displayTransactions.map((tx) => (
                        <tr
                          key={tx.hash}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/tx/${tx.hash}`}
                              className="font-mono text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {tx.blockHash ? (
                              <Link
                                href={`/block/${tx.blockNumber}`}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {tx.blockNumber}
                              </Link>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                {tx.blockNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/address/${tx.from}`}
                              className="font-mono text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {tx.to ? (
                              <Link
                                href={`/address/${tx.to}`}
                                className="font-mono text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                              </Link>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 italic">
                                Contract Creation
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {formatEther(BigInt(tx.value))}
                          </td>
                          <td className="px-4 py-3">
                            {tx.status === 'success' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Success
                              </span>
                            ) : tx.status === 'failed' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Failed
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                Unknown
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                            {tx.gasUsed
                              ? parseInt(tx.gasUsed).toLocaleString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refresh note */}
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Showing most recent {displayTransactions.length} transactions. Refresh to see updates.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

