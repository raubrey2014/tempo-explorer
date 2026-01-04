'use client'

import { useState } from 'react'
import Link from 'next/link'

interface StatsResult {
  address: string
  transferCount: number
  transferVolume: string
  feePaymentCount: number
  feeVolume: string
}

interface TestResult {
  success: boolean
  transaction?: {
    hash: string
    from: string
    to: string | null
    blockNumber: string
    blockHash: string
    status: string
    gasUsed?: string
    effectiveGasPrice?: string
    feeToken?: string
  }
  receipt?: {
    logs?: Array<{
      address: string
      topics: string[]
      data: string
    }>
    feeToken?: string
    gasUsed?: string
    effectiveGasPrice?: string
  }
  stablecoinsDetected?: number
  stats?: StatsResult[]
  error?: string
  message?: string
}

export default function TestStablecoinStatsPage() {
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txHash.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-stablecoin-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txHash: txHash.trim() }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold mb-2">Stablecoin Stats Test</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test stablecoin detection and stats calculation for a single transaction
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <label
                htmlFor="txHash"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Transaction Hash
              </label>
              <div className="flex gap-4">
                <input
                  id="txHash"
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !txHash.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Test Transaction'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Example: 0x71851af06222bbf7d4f0cd433924c1c781ddae5f27acaf8d6ed9e0aebbbc22ba
              </p>
            </div>
          </form>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Error */}
              {!result.success && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                  <h2 className="text-xl font-semibold text-red-900 dark:text-red-400 mb-2">
                    Error
                  </h2>
                  <p className="text-red-700 dark:text-red-300">{result.error}</p>
                  {result.message && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      {result.message}
                    </p>
                  )}
                </div>
              )}

              {/* Success Results */}
              {result.success && result.transaction && (
                <>
                  {/* Transaction Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Transaction Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Hash
                        </label>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                          {result.transaction.hash}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Block Number
                        </label>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {result.transaction.blockNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          From
                        </label>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                          {result.transaction.from}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          To
                        </label>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                          {result.transaction.to || 'Contract Creation'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Status
                        </label>
                        <p className="text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              result.transaction.status === 'success'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {result.transaction.status}
                          </span>
                        </p>
                      </div>
                      {result.transaction.feeToken && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Fee Token
                          </label>
                          <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                            {result.transaction.feeToken}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stablecoin Detection */}
                  {result.stablecoinsDetected !== undefined && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Stablecoin Detection
                      </h2>
                      <p className="text-gray-700 dark:text-gray-300">
                        {result.stablecoinsDetected > 0
                          ? `Detected ${result.stablecoinsDetected} new stablecoin(s)`
                          : 'No new stablecoins detected'}
                      </p>
                    </div>
                  )}

                  {/* Stats Results */}
                  {result.stats && result.stats.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          Stablecoin Statistics
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Stats calculated for this transaction
                        </p>
                      </div>
                      <div className="p-6">
                        <div className="space-y-6">
                          {result.stats.map((stat, index) => (
                            <div
                              key={stat.address}
                              className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                            >
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Stablecoin #{index + 1}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Address
                                  </label>
                                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                                    {stat.address}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Transfer Count
                                  </label>
                                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stat.transferCount}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Transfer Volume
                                  </label>
                                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                    {BigInt(stat.transferVolume).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Fee Payment Count
                                  </label>
                                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {stat.feePaymentCount}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Fee Volume
                                  </label>
                                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                    {BigInt(stat.feeVolume).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No Stablecoin Activity
                      </h2>
                      <p className="text-gray-700 dark:text-gray-300">
                        This transaction does not contain any stablecoin transfers or fee payments.
                      </p>
                    </div>
                  )}

                  {/* Receipt Logs */}
                  {result.receipt && result.receipt.logs && result.receipt.logs.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          Transaction Logs
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {result.receipt.logs.length} log(s) found
                        </p>
                      </div>
                      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                        {result.receipt.logs.map((log, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="mb-2">
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Log #{index}
                              </label>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Address
                                </label>
                                <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                                  {log.address}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Topics ({log.topics.length})
                                </label>
                                <div className="space-y-1">
                                  {log.topics.map((topic, topicIndex) => (
                                    <p
                                      key={topicIndex}
                                      className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all bg-white dark:bg-gray-800 p-2 rounded"
                                    >
                                      [{topicIndex}]: {topic}
                                    </p>
                                  ))}
                                </div>
                              </div>
                              {log.data && log.data !== '0x' && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    Data
                                  </label>
                                  <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all bg-white dark:bg-gray-800 p-2 rounded">
                                    {log.data}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

