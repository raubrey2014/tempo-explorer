'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTransaction, useTransactionReceipt } from 'wagmi'
import { formatEther, formatUnits } from 'viem'

export default function TransactionPage() {
  const params = useParams()
  const txId = params.txid as string

  const { data: transaction, isLoading: txLoading, isError: txError, error: txErrorObj } = useTransaction({
    hash: txId as `0x${string}`,
  })

  const { data: receipt, isLoading: receiptLoading, isError: receiptError, error: receiptErrorObj } = useTransactionReceipt({
    hash: txId as `0x${string}`,
  })

  const isLoading = txLoading || receiptLoading
  const isError = txError || receiptError

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatValue = (value: bigint | undefined) => {
    if (value === undefined) return 'N/A'
    return formatEther(value)
  }

  const formatGasPrice = (gasPrice: bigint | undefined) => {
    if (gasPrice === undefined) return 'N/A'
    return formatUnits(gasPrice, 9) // Gwei
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
          <h1 className="text-3xl font-bold mb-6">Transaction Details</h1>
          
          {isLoading && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">Loading transaction details...</p>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading transaction</p>
              <p className="text-sm text-red-500 dark:text-red-400">
                {txErrorObj?.message || receiptErrorObj?.message || 'Failed to fetch transaction details'}
              </p>
            </div>
          )}

          {!isLoading && !isError && transaction && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-6">
              {/* Transaction Hash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Hash
                </label>
                <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all">
                  {transaction.hash}
                </div>
              </div>

              {/* Status */}
              {receipt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        receipt.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {receipt.status === 'success' ? '✓ Success' : '✗ Failed'}
                    </span>
                  </div>
                </div>
              )}

              {/* From/To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From
                  </label>
                  <Link
                    href={`/address/${transaction.from}`}
                    className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all block hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {transaction.from}
                  </Link>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To
                  </label>
                  {transaction.to || receipt?.contractAddress ? (
                    <Link
                      href={`/address/${transaction.to || receipt?.contractAddress}`}
                      className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all block hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {transaction.to || receipt?.contractAddress}
                    </Link>
                  ) : (
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all">
                      Contract Creation
                    </div>
                  )}
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value
                </label>
                <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  {formatValue(transaction.value)} ETH
                </div>
              </div>

              {/* Block Info */}
              {receipt && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Block Number
                    </label>
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                      {receipt.blockNumber.toString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Block Hash
                    </label>
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all">
                      {formatAddress(receipt.blockHash)}
                    </div>
                  </div>
                </div>
              )}

              {/* Gas Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gas Limit
                  </label>
                  <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {transaction.gas?.toString() || 'N/A'}
                  </div>
                </div>
                {receipt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gas Used
                    </label>
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                      {receipt.gasUsed.toString()}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gas Price
                  </label>
                  <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {formatGasPrice(transaction.gasPrice)} Gwei
                  </div>
                </div>
              </div>

              {/* Transaction Index */}
              {receipt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transaction Index
                  </label>
                  <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {receipt.transactionIndex.toString()}
                  </div>
                </div>
              )}

              {/* Nonce */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nonce
                </label>
                <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  {transaction.nonce?.toString() || 'N/A'}
                </div>
              </div>

              {/* Input Data */}
              {transaction.input && transaction.input !== '0x' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Input Data
                  </label>
                  <div className="font-mono text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all max-h-40 overflow-y-auto">
                    {transaction.input}
                  </div>
                </div>
              )}

              {/* Logs */}
              {receipt && receipt.logs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logs ({receipt.logs.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {receipt.logs.map((log, index) => (
                      <div
                        key={index}
                        className="font-mono text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <div className="text-gray-600 dark:text-gray-400 mb-1">
                          Address: {formatAddress(log.address)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Topics: {log.topics.length}
                        </div>
                      </div>
                    ))}
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

