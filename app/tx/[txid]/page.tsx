'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTransaction, useTransactionReceipt } from 'wagmi'
import { formatEther, formatUnits } from 'viem'

interface TransactionField {
  label: string
  value: string | React.ReactNode
  explanation: string
}

type Tab = 'overview' | 'transaction' | 'receipt' | 'raw'

export default function TransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const txId = params.txid as string
  
  // Get active tab from URL query param, default to 'overview'
  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab: Tab = tabParam && ['overview', 'transaction', 'receipt', 'raw'].includes(tabParam) 
    ? tabParam 
    : 'overview'
  
  const setActiveTab = (tab: Tab) => {
    router.push(`/tx/${txId}?tab=${tab}`, { scroll: false })
  }

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

  // Determine transaction type based on from/to addresses
  const getTransactionType = (
    from: string | undefined,
    to: string | null | undefined,
    contractAddress: string | null | undefined
  ): {
    type: 'mint' | 'burn' | 'transfer'
    label: string
    explanation: string
  } => {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
    const fromLower = from?.toLowerCase()
    // Check both 'to' and contractAddress (for contract creation transactions)
    const toAddress = to || contractAddress
    const toLower = toAddress?.toLowerCase()
    
    // Mint: from address is zero address
    if (fromLower === ZERO_ADDRESS.toLowerCase()) {
      return {
        type: 'mint',
        label: 'Mint',
        explanation: 'A mint transaction creates new tokens or assets. This is identified by the "From" address being the zero address (0x0000000000000000000000000000000000000000), indicating that tokens are being created from nothing and sent to the recipient address. Minting typically occurs in token contracts when new supply is created.',
      }
    }
    
    // Burn: to address is zero address
    if (toLower === ZERO_ADDRESS.toLowerCase()) {
      return {
        type: 'burn',
        label: 'Burn',
        explanation: 'A burn transaction destroys tokens or assets by sending them to the zero address (0x0000000000000000000000000000000000000000). This permanently removes the tokens from circulation, reducing the total supply. Burning is commonly used in token contracts to implement deflationary mechanisms or to destroy tokens that are no longer needed.',
      }
    }
    
    // Transfer: all other cases (including contract creation)
    return {
      type: 'transfer',
      label: 'Transfer',
      explanation: 'A standard transfer transaction moves tokens or value from one address to another. Both the "From" and "To" addresses are valid, non-zero addresses, indicating a normal transfer of assets between accounts. This category also includes contract creation transactions. This is the most common type of transaction on the blockchain.',
    }
  }

  // Build Overview tab fields (key fields from both transaction and receipt)
  const getOverviewFields = (): TransactionField[] => {
    if (!transaction) return []

    const txType = getTransactionType(
      transaction.from,
      transaction.to,
      receipt?.contractAddress || null
    )
    
    const fields: TransactionField[] = [
      {
        label: 'Transaction Hash',
        value: (
          <span className="font-mono break-all">{transaction.hash}</span>
        ),
        explanation: 'The unique identifier (hash) of this transaction, computed from the transaction data using Keccak-256 hashing. This hash uniquely identifies the transaction on the blockchain and is identical in format and function to Ethereum transaction hashes. It serves as a permanent, immutable reference to this transaction.',
      },
      {
        label: 'Transaction Type',
        value: (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
              txType.type === 'mint'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                : txType.type === 'burn'
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {txType.label}
          </span>
        ),
        explanation: txType.explanation,
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
          <span className="font-mono">{formatValue(transaction.value)}</span>
        ),
        explanation: 'The amount of native currency transferred with this transaction. Unlike Ethereum which uses ETH, Tempo uses its own native currency. This value represents the native currency sent from the "From" address to the "To" address. A value of 0 is common for contract interaction transactions that don\'t transfer native currency.',
      },
      {
        label: 'Nonce',
        value: (
          <span className="font-mono">{transaction.nonce?.toString() || 'N/A'}</span>
        ),
        explanation: 'A sequential number assigned to each transaction from the sender\'s account, starting at 0 and incrementing with each transaction. The nonce prevents transaction replay attacks and ensures transactions are processed in order. This mechanism is identical to Ethereum: each account maintains its own nonce counter, and transactions must use the next expected nonce value.',
      },
    ]

    // Add block information from receipt if available
    if (receipt) {
      fields.push({
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
      })
      fields.push({
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
      })
      fields.push({
        label: 'Gas Used',
        value: (
          <span className="font-mono">{formatGas(receipt.gasUsed)}</span>
        ),
        explanation: 'The actual amount of gas consumed by this transaction after execution. This is determined by the computational complexity of the transaction and cannot exceed the gas limit. In Ethereum, unused gas is refunded to the sender. In Tempo, gas usage follows the same rules: the sender pays for gas used at the gas price, and any difference between gas limit and gas used is not charged.',
      })
      if (receipt.contractAddress) {
        fields.push({
          label: 'Contract Address',
          value: (
            <Link
              href={`/address/${receipt.contractAddress}`}
              className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
            >
              {receipt.contractAddress}
            </Link>
          ),
          explanation: 'The address of the newly created contract (only present for contract creation transactions). This address is computed deterministically from the sender\'s address and nonce, ensuring that the same contract creation transaction will always result in the same contract address.',
        })
      }
    }

    return fields
  }

  // Build Transaction tab fields (all transaction-specific fields)
  const getTransactionFields = (): TransactionField[] => {
    if (!transaction) return []

    const txType = getTransactionType(
      transaction.from,
      transaction.to,
      receipt?.contractAddress || null
    )

    const fields: TransactionField[] = [
      {
        label: 'Hash',
        value: (
          <span className="font-mono break-all">{transaction.hash}</span>
        ),
        explanation: 'The unique identifier (hash) of this transaction, computed from the transaction data using Keccak-256 hashing.',
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
        explanation: 'The address of the account that initiated and signed this transaction.',
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
        ) : (
          <span className="italic">Contract Creation</span>
        ),
        explanation: 'The recipient address of the transaction. Empty for contract creation transactions.',
      },
      {
        label: 'Value',
        value: (
          <span className="font-mono">{formatValue(transaction.value)}</span>
        ),
        explanation: 'The amount of native currency transferred with this transaction. Unlike Ethereum which uses ETH, Tempo uses its own native currency.',
      },
      {
        label: 'Nonce',
        value: (
          <span className="font-mono">{transaction.nonce?.toString() || 'N/A'}</span>
        ),
        explanation: 'A sequential number assigned to each transaction from the sender\'s account.',
      },
      {
        label: 'Transaction Type',
        value: (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
              txType.type === 'mint'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                : txType.type === 'burn'
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {txType.label}
          </span>
        ),
        explanation: txType.explanation,
      },
      {
        label: 'Gas Limit',
        value: (
          <span className="font-mono">{formatGas(transaction.gas)}</span>
        ),
        explanation: 'The maximum amount of gas the sender is willing to pay for this transaction.',
      },
      {
        label: 'Gas Price',
        value: (
          <span className="font-mono">{formatGasPrice(transaction.gasPrice)}</span>
        ),
        explanation: 'The price per unit of gas, paid by the transaction sender.',
      },
    ]

    // Add type if available in transaction
    if ('type' in transaction && transaction.type !== undefined) {
      fields.push({
        label: 'Type',
        value: (
          <span className="font-mono">{transaction.type.toString()}</span>
        ),
        explanation: 'The transaction type (0: legacy, 1: EIP-2930, 2: EIP-1559, etc.).',
      })
    }

    // Add chainId if available
    if ('chainId' in transaction && transaction.chainId !== undefined) {
      fields.push({
        label: 'Chain ID',
        value: (
          <span className="font-mono">{transaction.chainId.toString()}</span>
        ),
        explanation: 'The chain ID of the network on which this transaction was submitted.',
      })
    }

    // Add input data
    fields.push({
      label: 'Input Data',
      value: transaction.input && transaction.input !== '0x' ? (
        <div className="font-mono text-xs break-all max-h-40 overflow-y-auto">
          {transaction.input}
        </div>
      ) : (
        <span className="text-gray-500 dark:text-gray-400 italic">0x (no input data)</span>
      ),
      explanation: 'The encoded function call data or contract creation bytecode. For contract interactions, this contains the function selector (first 4 bytes) followed by encoded parameters.',
    })

    return fields
  }

  // Build Receipt tab fields (all receipt-specific fields)
  const getReceiptFields = (): TransactionField[] => {
    if (!receipt) return []

    const fields: TransactionField[] = [
      {
        label: 'Status',
        value: (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
              receipt.status === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {receipt.status === 'success' ? '✓ Success' : '✗ Failed'}
          </span>
        ),
        explanation: 'The execution status of the transaction: Success indicates the transaction executed without errors, while Failed means the transaction was reverted.',
      },
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
        explanation: 'The block number in which this transaction was included.',
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
        explanation: 'The cryptographic hash of the block containing this transaction.',
      },
      {
        label: 'Transaction Index',
        value: (
          <span className="font-mono">{receipt.transactionIndex.toString()}</span>
        ),
        explanation: 'The position (zero-indexed) of this transaction within its block.',
      },
      {
        label: 'Gas Used',
        value: (
          <span className="font-mono">{formatGas(receipt.gasUsed)}</span>
        ),
        explanation: 'The actual amount of gas consumed by this transaction after execution.',
      },
    ]

    // Add cumulativeGasUsed if available
    if ('cumulativeGasUsed' in receipt && receipt.cumulativeGasUsed !== undefined) {
      fields.push({
        label: 'Cumulative Gas Used',
        value: (
          <span className="font-mono">{formatGas(receipt.cumulativeGasUsed)}</span>
        ),
        explanation: 'The total amount of gas used by all transactions in the block up to and including this transaction. This value increases with each transaction in the block.',
      })
    }

    // Add effectiveGasPrice if available
    if ('effectiveGasPrice' in receipt && receipt.effectiveGasPrice !== undefined) {
      fields.push({
        label: 'Effective Gas Price',
        value: (
          <span className="font-mono">{formatGasPrice(receipt.effectiveGasPrice)}</span>
        ),
        explanation: 'The actual gas price paid for this transaction, which may differ from the transaction\'s gasPrice due to EIP-1559 base fee adjustments.',
      })
    }

    // Add type if available
    if ('type' in receipt && receipt.type !== undefined) {
      fields.push({
        label: 'Type',
        value: (
          <span className="font-mono">{receipt.type.toString()}</span>
        ),
        explanation: 'The transaction type (0: legacy, 1: EIP-2930, 2: EIP-1559, etc.).',
      })
    }

    // Add root if available (for pre-Byzantium blocks)
    if ('root' in receipt && receipt.root !== undefined) {
      fields.push({
        label: 'Root',
        value: (
          <span className="font-mono break-all">{receipt.root}</span>
        ),
        explanation: 'The state root hash (only present for pre-Byzantium blocks). Post-Byzantium, this field is replaced by the status field.',
      })
    }

    // Add contractAddress if available
    if (receipt.contractAddress) {
      fields.push({
        label: 'Contract Address',
        value: (
          <Link
            href={`/address/${receipt.contractAddress}`}
            className="font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {receipt.contractAddress}
          </Link>
        ),
        explanation: 'The address of the newly created contract (only present for contract creation transactions).',
      })
    }

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

  // Render a compact field for overview (no explanation)
  const renderCompactField = (field: TransactionField, key: string) => (
    <div key={key} className="space-y-1">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
        {field.label}
      </label>
      <div className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 break-all">
        {field.value}
      </div>
    </div>
  )

  // Render overview in a compact grid layout
  const renderOverview = (fields: TransactionField[]) => {
    if (fields.length === 0) return null

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => renderCompactField(field, field.label))}
        </div>
      </div>
    )
  }

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
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {description}
              </p>
            )}
          </div>
          <div className="space-y-6">
            {fields.map((field) => renderField(field, field.label))}
          </div>
        </div>
      </div>
    )
  }

  // Render logs section
  const renderLogsSection = () => {
    if (!receipt) return null

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Logs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Event logs emitted by smart contracts during transaction execution. Logs are identical to Ethereum's event logging mechanism: contracts emit events that are recorded as logs with indexed topics and data. These logs enable efficient querying and indexing of contract events on the blockchain.
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
                      Indexed parameters of the event. Topic[0] is always the keccak256 hash of the event signature (e.g., Transfer(address,address,uint256)). Topics[1..N] contain indexed event parameters, hashed if larger than 32 bytes. Topics enable efficient log filtering by event type and parameter values, identical to Ethereum's event indexing mechanism.
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
                        Non-indexed event parameters, encoded in ABI format. This data is not indexed and cannot be efficiently filtered, but contains the full parameter values. The format is identical to Ethereum's event data encoding.
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
    )
  }

  // Render raw JSON view
  const renderRawView = () => {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Transaction (Raw)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Raw JSON representation of the transaction object.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
              <pre className="font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {transaction ? JSON.stringify(transaction, (key, value) => 
                  typeof value === 'bigint' ? value.toString() : value
                , 2) : 'No transaction data available'}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Receipt (Raw)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Raw JSON representation of the transaction receipt object.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
              <pre className="font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {receipt ? JSON.stringify(receipt, (key, value) => 
                  typeof value === 'bigint' ? value.toString() : value
                , 2) : 'No receipt data available (transaction may be pending)'}
              </pre>
            </div>
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
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('transaction')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'transaction'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Transaction
                  </button>
                  <button
                    onClick={() => setActiveTab('receipt')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'receipt'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Receipt
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'raw'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Raw
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === 'overview' && (
                  <div>
                    {renderOverview(getOverviewFields())}
                  </div>
                )}

                {activeTab === 'transaction' && (
                  <div className="space-y-6">
                    {renderSection(
                      'Transaction Details',
                      'All fields from the transaction object, including sender, recipient, value, gas settings, and input data.',
                      getTransactionFields()
                    )}
                  </div>
                )}

                {activeTab === 'receipt' && (
                  <div className="space-y-6">
                    {receipt ? (
                      <>
                        {renderSection(
                          'Receipt Details',
                          'All fields from the transaction receipt, including execution status, block information, gas usage, and contract creation details.',
                          getReceiptFields()
                        )}
                        {renderLogsSection()}
                      </>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                        <p className="text-gray-600 dark:text-gray-400">
                          Receipt not available. The transaction may still be pending.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'raw' && (
                  <div>
                    {renderRawView()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

