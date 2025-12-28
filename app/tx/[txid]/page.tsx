'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTransaction, useTransactionReceipt } from 'wagmi'
import { formatEther, formatUnits } from 'viem'

interface TransactionField {
  label: string
  value: string | React.ReactNode
  explanation: string
}

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

  const formatGas = (gas: bigint | undefined) => {
    if (gas === undefined) return 'N/A'
    return gas.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Build Overview section fields
  const getOverviewFields = (): TransactionField[] => {
    if (!transaction) return []

    const fields: TransactionField[] = [
      {
        label: 'Transaction Hash',
        value: (
          <span className="font-mono break-all">{transaction.hash}</span>
        ),
        explanation: 'The unique identifier (hash) of this transaction, computed from the transaction data using Keccak-256 hashing. This hash uniquely identifies the transaction on the blockchain and is identical in format and function to Ethereum transaction hashes. It serves as a permanent, immutable reference to this transaction.',
      },
      {
        label: 'Status',
        value: receipt ? (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
              receipt.status === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {receipt.status === 'success' ? '✓ Success' : '✗ Failed'}
          </span>
        ) : 'Pending',
        explanation: 'The execution status of the transaction: Success indicates the transaction executed without errors, while Failed means the transaction was reverted (usually due to insufficient gas or a revert in the smart contract code). This field is identical to Ethereum\'s transaction status and is only available after the transaction has been included in a block.',
      },
      {
        label: 'From',
        value: (
          <Link
            href={`/address/${transaction.from}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {transaction.from}
          </Link>
        ),
        explanation: 'The address of the account that initiated and signed this transaction. This is the sender\'s Ethereum-compatible address, identical in format and function to Ethereum addresses. The account\'s private key is used to cryptographically sign the transaction, ensuring authenticity and authorization.',
      },
      {
        label: 'To',
        value: transaction.to ? (
          <Link
            href={`/address/${transaction.to}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {transaction.to}
          </Link>
        ) : receipt?.contractAddress ? (
          <Link
            href={`/address/${receipt.contractAddress}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {receipt.contractAddress}
          </Link>
        ) : (
          <span className="italic">Contract Creation</span>
        ),
        explanation: 'The recipient address of the transaction. If this field is empty but a contract address appears in the receipt, this was a contract creation transaction. Like Ethereum, Tempo transactions can send value or call a smart contract, or deploy a new contract. In Tempo, transactions to addresses starting with `0x20c0000000000000000000000000` are payment lane transactions.',
      },
      {
        label: 'Value',
        value: (
          <span className="font-mono">{formatValue(transaction.value)} ETH</span>
        ),
        explanation: 'The amount of native currency (ETH) transferred with this transaction, denominated in Ether. Like Ethereum, this value represents the ETH sent from the "From" address to the "To" address. A value of 0 ETH is common for contract interaction transactions that don\'t transfer native currency.',
      },
      {
        label: 'Nonce',
        value: (
          <span className="font-mono">{transaction.nonce?.toString() || 'N/A'}</span>
        ),
        explanation: 'A sequential number assigned to each transaction from the sender\'s account, starting at 0 and incrementing with each transaction. The nonce prevents transaction replay attacks and ensures transactions are processed in order. This mechanism is identical to Ethereum: each account maintains its own nonce counter, and transactions must use the next expected nonce value.',
      },
    ]

    // Only include Input Data if it exists and is not empty
    if (transaction.input && transaction.input !== '0x') {
      fields.push({
        label: 'Input Data',
        value: (
          <div className="font-mono text-xs break-all max-h-40 overflow-y-auto">
            {transaction.input}
          </div>
        ),
        explanation: 'The encoded function call data or contract creation bytecode. For contract interactions, this contains the function selector (first 4 bytes) followed by encoded parameters. For contract creation, this contains the contract bytecode. The format is identical to Ethereum: hexadecimal-encoded data prefixed with "0x". This field is empty (0x) for simple value transfers.',
      })
    }

    return fields
  }

  // Build Gas section fields
  const getGasFields = (): TransactionField[] => {
    if (!transaction) return []

    const fields: TransactionField[] = [
      {
        label: 'Gas Limit',
        value: (
          <span className="font-mono">{formatGas(transaction.gas)}</span>
        ),
        explanation: 'The maximum amount of gas the sender is willing to pay for this transaction. This is set by the sender and acts as a safety limit to prevent runaway contract execution. In Ethereum and Tempo, if a transaction exceeds its gas limit during execution, it reverts and the sender still pays for all gas consumed. The gas limit must cover all computational steps, storage operations, and log emissions.',
      },
    ]

    if (receipt) {
      fields.push({
        label: 'Gas Used',
        value: (
          <span className="font-mono">{formatGas(receipt.gasUsed)}</span>
        ),
        explanation: 'The actual amount of gas consumed by this transaction after execution. This is determined by the computational complexity of the transaction and cannot exceed the gas limit. In Ethereum, unused gas is refunded to the sender. In Tempo, gas usage follows the same rules: the sender pays for gas used at the gas price, and any difference between gas limit and gas used is not charged.',
      })
    }

    fields.push({
      label: 'Gas Price',
      value: (
        <span className="font-mono">{formatGasPrice(transaction.gasPrice)} Gwei</span>
      ),
      explanation: 'The price per unit of gas, paid by the transaction sender. In Ethereum\'s legacy transaction model (pre-EIP-1559), this is a fixed price. In Tempo, as in Ethereum post-EIP-1559, transactions can specify both a base fee (burned) and a priority fee (paid to validators). The gas price shown here represents the effective price per gas unit that the sender agrees to pay.',
    })

    return fields
  }

  // Build Block section fields
  const getBlockFields = (): TransactionField[] => {
    if (!receipt) return []

    const fields: TransactionField[] = [
      {
        label: 'Block Number',
        value: (
          <Link
            href={`/block/${receipt.blockNumber.toString()}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {receipt.blockNumber.toString()}
          </Link>
        ),
        explanation: 'The block number in which this transaction was included. Like Ethereum, this represents the sequential position of the block in the blockchain. Transactions are only finalized once included in a block, and this number indicates when (in blockchain terms) the transaction was processed.',
      },
      {
        label: 'Block Hash',
        value: (
          <Link
            href={`/block/${receipt.blockHash}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {receipt.blockHash}
          </Link>
        ),
        explanation: 'The cryptographic hash of the block containing this transaction. Like Ethereum, this hash uniquely identifies the block and provides a tamper-evident link to the block\'s contents. The block hash is computed from the block header using Keccak-256 hashing, ensuring immutability.',
      },
      {
        label: 'Transaction Index',
        value: (
          <span className="font-mono">{receipt.transactionIndex.toString()}</span>
        ),
        explanation: 'The position (zero-indexed) of this transaction within its block. This index indicates the order in which transactions were processed in the block. Like Ethereum, transactions within a block are executed sequentially, and the index can be used to reference this specific transaction within the block\'s transaction list.',
      },
    ]

    return fields
  }

  // Render a field with its explanation
  const renderField = (field: TransactionField, key: string) => (
    <div key={key}>
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
  )

  // Render a section with title and description
  const renderSection = (
    title: string,
    description: string,
    fields: TransactionField[]
  ) => {
    if (fields.length === 0) return null

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {description}
            </p>
          </div>
          <div className="space-y-6">
            {fields.map((field) => renderField(field, field.label))}
          </div>
        </div>
      </div>
    )
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
            <div className="space-y-6">
              {/* Overview Section */}
              {renderSection(
                'Overview',
                'Basic transaction information including sender, recipient, value, and execution status. These fields are identical in format and function to Ethereum transactions.',
                getOverviewFields()
              )}

              {/* Gas Section */}
              {renderSection(
                'Gas',
                'Gas-related fields showing the computational cost of executing this transaction. Gas limits, usage, and pricing work identically to Ethereum, though Tempo may partition gas allocation for payment lane transactions.',
                getGasFields()
              )}

              {/* Block Section */}
              {receipt && renderSection(
                'Block',
                'Information about the block containing this transaction. These fields are identical to Ethereum and indicate when and where the transaction was included in the blockchain.',
                getBlockFields()
              )}

              {/* Logs Section */}
              {receipt && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Logs
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Event logs emitted by smart contracts during transaction execution. Logs are identical to Ethereum\'s event logging mechanism: contracts emit events that are recorded as logs with indexed topics and data. These logs enable efficient querying and indexing of contract events on the blockchain.
                      </p>
                      {receipt.logs.length > 0 && (
                        <div className="mb-4">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded">
                            {receipt.logs.length} {receipt.logs.length === 1 ? 'log' : 'logs'}
                          </span>
                        </div>
                      )}
                    </div>
                    {receipt.logs.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {receipt.logs.map((log, index) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 space-y-3"
                          >
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Log #{index}
                              </label>
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                                Event logs are emitted by smart contracts to record state changes or important events. Like Ethereum, Tempo logs consist of an address (the contract that emitted the event), indexed topics (the event signature and indexed parameters), and data (non-indexed parameters). Logs are stored in the blockchain and can be efficiently queried by topics or addresses.
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Address
                              </label>
                              <Link
                                href={`/address/${log.address}`}
                                className="font-mono text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                              >
                                {log.address}
                              </Link>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                The address of the smart contract that emitted this log event. This is the contract that executed code during the transaction and called an event-emitting function.
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Topics ({log.topics.length})
                              </label>
                              <div className="space-y-1">
                                {log.topics.map((topic, topicIndex) => (
                                  <div
                                    key={topicIndex}
                                    className="font-mono text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded break-all"
                                  >
                                    [{topicIndex}]: {topic}
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                Indexed parameters of the event. Topic[0] is always the keccak256 hash of the event signature (e.g., Transfer(address,address,uint256)). Topics[1..N] contain indexed event parameters, hashed if larger than 32 bytes. Topics enable efficient log filtering by event type and parameter values, identical to Ethereum\'s event indexing mechanism.
                              </p>
                            </div>
                            {log.data && log.data !== '0x' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                  Data
                                </label>
                                <div className="font-mono text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded break-all max-h-32 overflow-y-auto">
                                  {log.data}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                  Non-indexed event parameters, encoded in ABI format. This data is not indexed and cannot be efficiently filtered, but contains the full parameter values. The format is identical to Ethereum\'s event data encoding.
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No logs emitted by this transaction</p>
                      </div>
                    )}
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

