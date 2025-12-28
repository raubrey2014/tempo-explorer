'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useReadContract, useBlockNumber, usePublicClient } from 'wagmi'
import { formatUnits, formatEther, hexToBytes, bytesToHex } from 'viem'
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

// EVM Opcodes mapping
const OPCODES: Record<number, string> = {
  0x00: 'STOP',
  0x01: 'ADD',
  0x02: 'MUL',
  0x03: 'SUB',
  0x04: 'DIV',
  0x05: 'SDIV',
  0x06: 'MOD',
  0x07: 'SMOD',
  0x08: 'ADDMOD',
  0x09: 'MULMOD',
  0x0a: 'EXP',
  0x0b: 'SIGNEXTEND',
  0x10: 'LT',
  0x11: 'GT',
  0x12: 'SLT',
  0x13: 'SGT',
  0x14: 'EQ',
  0x15: 'ISZERO',
  0x16: 'AND',
  0x17: 'OR',
  0x18: 'XOR',
  0x19: 'NOT',
  0x1a: 'BYTE',
  0x1b: 'SHL',
  0x1c: 'SHR',
  0x1d: 'SAR',
  0x20: 'SHA3',
  0x30: 'ADDRESS',
  0x31: 'BALANCE',
  0x32: 'ORIGIN',
  0x33: 'CALLER',
  0x34: 'CALLVALUE',
  0x35: 'CALLDATALOAD',
  0x36: 'CALLDATASIZE',
  0x37: 'CALLDATACOPY',
  0x38: 'CODESIZE',
  0x39: 'CODECOPY',
  0x3a: 'GASPRICE',
  0x3b: 'EXTCODESIZE',
  0x3c: 'EXTCODECOPY',
  0x3d: 'RETURNDATASIZE',
  0x3e: 'RETURNDATACOPY',
  0x3f: 'EXTCODEHASH',
  0x40: 'BLOCKHASH',
  0x41: 'COINBASE',
  0x42: 'TIMESTAMP',
  0x43: 'NUMBER',
  0x44: 'DIFFICULTY',
  0x45: 'GASLIMIT',
  0x50: 'POP',
  0x51: 'MLOAD',
  0x52: 'MSTORE',
  0x53: 'MSTORE8',
  0x54: 'SLOAD',
  0x55: 'SSTORE',
  0x56: 'JUMP',
  0x57: 'JUMPI',
  0x58: 'PC',
  0x59: 'MSIZE',
  0x5a: 'GAS',
  0x5b: 'JUMPDEST',
  0x60: 'PUSH1',
  0x61: 'PUSH2',
  0x62: 'PUSH3',
  0x63: 'PUSH4',
  0x64: 'PUSH5',
  0x65: 'PUSH6',
  0x66: 'PUSH7',
  0x67: 'PUSH8',
  0x68: 'PUSH9',
  0x69: 'PUSH10',
  0x6a: 'PUSH11',
  0x6b: 'PUSH12',
  0x6c: 'PUSH13',
  0x6d: 'PUSH14',
  0x6e: 'PUSH15',
  0x6f: 'PUSH16',
  0x70: 'PUSH17',
  0x71: 'PUSH18',
  0x72: 'PUSH19',
  0x73: 'PUSH20',
  0x74: 'PUSH21',
  0x75: 'PUSH22',
  0x76: 'PUSH23',
  0x77: 'PUSH24',
  0x78: 'PUSH25',
  0x79: 'PUSH26',
  0x7a: 'PUSH27',
  0x7b: 'PUSH28',
  0x7c: 'PUSH29',
  0x7d: 'PUSH30',
  0x7e: 'PUSH31',
  0x7f: 'PUSH32',
  0x80: 'DUP1',
  0x81: 'DUP2',
  0x82: 'DUP3',
  0x83: 'DUP4',
  0x84: 'DUP5',
  0x85: 'DUP6',
  0x86: 'DUP7',
  0x87: 'DUP8',
  0x88: 'DUP9',
  0x89: 'DUP10',
  0x8a: 'DUP11',
  0x8b: 'DUP12',
  0x8c: 'DUP13',
  0x8d: 'DUP14',
  0x8e: 'DUP15',
  0x8f: 'DUP16',
  0x90: 'SWAP1',
  0x91: 'SWAP2',
  0x92: 'SWAP3',
  0x93: 'SWAP4',
  0x94: 'SWAP5',
  0x95: 'SWAP6',
  0x96: 'SWAP7',
  0x97: 'SWAP8',
  0x98: 'SWAP9',
  0x99: 'SWAP10',
  0x9a: 'SWAP11',
  0x9b: 'SWAP12',
  0x9c: 'SWAP13',
  0x9d: 'SWAP14',
  0x9e: 'SWAP15',
  0x9f: 'SWAP16',
  0xa0: 'LOG0',
  0xa1: 'LOG1',
  0xa2: 'LOG2',
  0xa3: 'LOG3',
  0xa4: 'LOG4',
  0xf0: 'CREATE',
  0xf1: 'CALL',
  0xf2: 'CALLCODE',
  0xf3: 'RETURN',
  0xf4: 'DELEGATECALL',
  0xf5: 'CREATE2',
  0xfa: 'STATICCALL',
  0xfd: 'REVERT',
  0xfe: 'INVALID',
  0xff: 'SELFDESTRUCT',
}

interface DisassembledOpcode {
  offset: number
  opcode: string
  operand?: string
  bytes: string
}

// Disassemble bytecode to opcodes
function disassembleBytecode(bytecode: string): DisassembledOpcode[] {
  if (!bytecode || bytecode === '0x') return []
  
  const bytes = hexToBytes(bytecode as `0x${string}`)
  const result: DisassembledOpcode[] = []
  let i = 0

  while (i < bytes.length) {
    const offset = i
    const opcode = bytes[i]
    const opcodeName = OPCODES[opcode] || `UNKNOWN(0x${opcode.toString(16).padStart(2, '0')})`
    
    // Handle PUSH opcodes (0x60-0x7f) which have operands
      if (opcode >= 0x60 && opcode <= 0x7f) {
      const pushSize = opcode - 0x5f // Number of bytes to push
      i++
      if (i + pushSize <= bytes.length) {
        const operandBytes = bytes.slice(i, i + pushSize)
        const operand = bytesToHex(operandBytes)
        const instructionBytes = new Uint8Array(bytes.slice(offset, i + pushSize))
        result.push({
          offset,
          opcode: opcodeName,
          operand,
          bytes: bytesToHex(instructionBytes),
        })
        i += pushSize
      } else {
        // Invalid PUSH, just show the opcode
        const singleByte = new Uint8Array([opcode])
        result.push({
          offset,
          opcode: opcodeName,
          bytes: bytesToHex(singleByte),
        })
        i++
      }
    } else {
      const singleByte = new Uint8Array([opcode])
      result.push({
        offset,
        opcode: opcodeName,
        bytes: bytesToHex(singleByte),
      })
      i++
    }
  }

  return result
}

// Extract function selectors from bytecode (4-byte signatures)
function extractFunctionSelectors(bytecode: string): string[] {
  if (!bytecode || bytecode === '0x') return []
  
  const bytes = hexToBytes(bytecode as `0x${string}`)
  const selectors = new Set<string>()
  
  // Look for PUSH4 followed by EQ patterns (common in function dispatchers)
  // Also look for any 4-byte sequences that look like function selectors
  for (let i = 0; i < bytes.length - 3; i++) {
    // Check if this looks like a function selector (4 bytes)
    const potentialSelector = bytesToHex(bytes.slice(i, i + 4))
    
    // Function selectors are typically used with PUSH4 (0x63)
    // Check if there's a PUSH4 before this
    if (i >= 1 && bytes[i - 1] === 0x63) {
      selectors.add(potentialSelector)
    }
  }
  
  return Array.from(selectors).slice(0, 20) // Limit to first 20
}

// Interface for enriched function information
interface FunctionInfo {
  selector: string
  signature?: string
  name?: string
  inputs?: Array<{ type: string; name?: string }>
}

// Lookup function signature from 4byte.directory
async function lookupFunctionSignature(selector: string): Promise<string | null> {
  // Remove '0x' prefix if present
  const cleanSelector = selector.replace('0x', '')
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=${cleanSelector}`,
      {
        signal: controller.signal,
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      // Returns array of possible signatures (most common first)
      return data.results[0].text_signature
    }
    return null
  } catch (error) {
    // Fail gracefully - return null on any error (timeout, network error, etc.)
    return null
  }
}

// Parse function signature string to extract name and inputs
function parseFunctionSignature(signature: string): {
  name: string
  inputs: Array<{ type: string; name?: string }>
} | null {
  // Match: "functionName(type1,type2)" or "functionName()"
  const match = signature.match(/^(\w+)\((.*)\)$/)
  if (!match) return null
  
  const [, name, paramsStr] = match
  const inputs = paramsStr
    ? paramsStr.split(',').map(param => {
        const trimmed = param.trim()
        // Handle "type name" or just "type"
        const parts = trimmed.split(/\s+/)
        return {
          type: parts[0],
          name: parts[1] || undefined,
        }
      })
    : []
  
  return { name, inputs }
}

// Enrich function selectors with metadata from 4byte.directory
async function enrichFunctionSelectors(
  selectors: string[]
): Promise<FunctionInfo[]> {
  if (selectors.length === 0) return []
  
  const enriched = await Promise.all(
    selectors.map(async (selector) => {
      try {
        const signature = await lookupFunctionSignature(selector)
        
        if (signature) {
          const parsed = parseFunctionSignature(signature)
          if (parsed) {
            return {
              selector,
              signature,
              name: parsed.name,
              inputs: parsed.inputs,
            }
          }
          return {
            selector,
            signature,
          }
        }
        
        return { selector }
      } catch (error) {
        // Fail gracefully - return selector without enrichment
        return { selector }
      }
    })
  )
  
  return enriched
}

// AddressOverview component - displays transaction count and account type badge
function AddressOverview({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient()
  const [transactionCount, setTransactionCount] = useState<number | null>(null)
  const [isContract, setIsContract] = useState<boolean | null>(null)
  const [bytecodeSize, setBytecodeSize] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient) return

    const fetchAddressInfo = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch transaction count and bytecode in parallel
        const [txCount, bytecode] = await Promise.all([
          publicClient.getTransactionCount({ address }),
          publicClient.getCode({ address }),
        ])

        setTransactionCount(txCount)
        // A contract has bytecode, an EOA has '0x' or empty/null/undefined
        // Check: bytecode exists, is not '0x', and has meaningful content
        // Real contracts typically have at least several bytes of code
        // We use a minimum of 3 bytes to avoid false positives from minimal/edge case bytecode
        const bytecodeLength = bytecode ? (bytecode.length - 2) / 2 : 0 // Subtract '0x' prefix, divide by 2 for hex
        const hasCode = bytecode && 
                       bytecode.trim() !== '0x' && 
                       bytecode.trim() !== '' &&
                       bytecodeLength >= 3 // At least 3 bytes of actual code
        setIsContract(!!hasCode)
        if (hasCode && bytecode) {
          // Calculate bytecode size (remove '0x' prefix, each byte is 2 hex chars)
          setBytecodeSize((bytecode.length - 2) / 2)
        } else {
          setBytecodeSize(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch address info')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddressInfo()
  }, [publicClient, address])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading address information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Account Type
          </label>
          <div className="flex items-center gap-2">
            {isContract ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Contract
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                EOA
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Transaction Count
          </label>
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {transactionCount !== null ? transactionCount.toLocaleString() : 'N/A'}
          </div>
        </div>
        {isContract && bytecodeSize !== null && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Code Size
            </label>
            <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {bytecodeSize.toLocaleString()} bytes
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ContractInfo component - shows contract-specific details
function ContractInfo({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient()
  const { data: currentBlock } = useBlockNumber()
  const [bytecode, setBytecode] = useState<string | null>(null)
  const [firstSeenBlock, setFirstSeenBlock] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBytecode, setShowBytecode] = useState(false)
  const [showOpcodes, setShowOpcodes] = useState(false)
  const [opcodes, setOpcodes] = useState<DisassembledOpcode[]>([])
  const [functionSelectors, setFunctionSelectors] = useState<string[]>([])
  const [functionInfos, setFunctionInfos] = useState<FunctionInfo[]>([])
  const [isEnrichingFunctions, setIsEnrichingFunctions] = useState(false)
  const [hasSearchedForCreation, setHasSearchedForCreation] = useState(false)

  // Fetch bytecode and decode it
  useEffect(() => {
    if (!publicClient) return

    const fetchBytecode = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch bytecode
        const code = await publicClient.getCode({ address })
        setBytecode(code || null)
        
        // Decode bytecode - only if it's actually a contract (has meaningful bytecode)
        // Use same check as AddressOverview: at least 3 bytes of code
        const bytecodeLength = code ? (code.length - 2) / 2 : 0
        const isContract = code && 
                          code.trim() !== '0x' && 
                          code.trim() !== '' &&
                          bytecodeLength >= 3
        
        if (isContract && code) {
          const disassembled = disassembleBytecode(code)
          setOpcodes(disassembled)
          const selectors = extractFunctionSelectors(code)
          setFunctionSelectors(selectors)
          
          // Enrich selectors with metadata from 4byte.directory
          if (selectors.length > 0) {
            setIsEnrichingFunctions(true)
            try {
              const enriched = await enrichFunctionSelectors(selectors)
              setFunctionInfos(enriched)
            } catch (error) {
              // Fail gracefully - just use selectors without enrichment
              setFunctionInfos(selectors.map(s => ({ selector: s })))
            } finally {
              setIsEnrichingFunctions(false)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contract info')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBytecode()
  }, [publicClient, address])

  // Search for contract creation transaction (only once)
  useEffect(() => {
    if (!publicClient || !currentBlock || firstSeenBlock || hasSearchedForCreation) return

    const searchForCreation = async () => {
      setHasSearchedForCreation(true)
      const blocksToCheck = 1000 // Check up to 1000 blocks back
      let found = false

      for (let i = 0; i < blocksToCheck && !found; i++) {
        const blockNum = currentBlock - BigInt(i)
        if (blockNum < 0) break

        try {
          const block = await publicClient.getBlock({
            blockNumber: blockNum,
            includeTransactions: true,
          })

          if (block.transactions) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object') {
                // Check if this is a contract creation that resulted in this address
                if (!tx.to) {
                  // Contract creation transaction
                  try {
                    const receipt = await publicClient.getTransactionReceipt({
                      hash: tx.hash,
                    })
                    if (
                      receipt.contractAddress &&
                      receipt.contractAddress.toLowerCase() === address.toLowerCase()
                    ) {
                      setFirstSeenBlock(block.number)
                      found = true
                      break
                    }
                  } catch {
                    // Continue searching
                  }
                }
              }
            }
          }
        } catch {
          // Continue searching
        }
      }
    }

    searchForCreation()
  }, [publicClient, address, currentBlock, firstSeenBlock, hasSearchedForCreation])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading contract information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  // Only show if it's actually a contract (same check as AddressOverview)
  const bytecodeLength = bytecode ? (bytecode.length - 2) / 2 : 0
  const isContract = bytecode && 
                     bytecode.trim() !== '0x' && 
                     bytecode.trim() !== '' &&
                     bytecodeLength >= 3
  
  if (!isContract) {
    return null // Not a contract, don't show this component
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Contract Information
        </label>
        <div className="space-y-3">
          {firstSeenBlock !== null && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                First Seen (Deployed)
              </label>
              <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                <Link
                  href={`/block/${firstSeenBlock.toString()}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Block {firstSeenBlock.toString()}
                </Link>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {/* Function Selectors */}
            {(functionSelectors.length > 0 || functionInfos.length > 0) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Functions
                  {isEnrichingFunctions && (
                    <span className="ml-2 text-xs text-gray-400">(loading signatures...)</span>
                  )}
                </label>
                <div className="space-y-2">
                  {functionInfos.length > 0 ? (
                    // Show enriched function info
                    functionInfos.map((func, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-200 dark:border-blue-800"
                      >
                        {func.name ? (
                          <div className="font-mono text-xs">
                            <span className="text-blue-700 dark:text-blue-300 font-semibold">
                              {func.name}
                            </span>
                            {func.inputs && func.inputs.length > 0 && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {'('}
                                {func.inputs.map((input, i) => (
                                  <span key={i}>
                                    {input.type}
                                    {input.name && ` ${input.name}`}
                                    {i < func.inputs!.length - 1 && ', '}
                                  </span>
                                ))}
                                {')'}
                              </span>
                            )}
                            {(!func.inputs || func.inputs.length === 0) && (
                              <span className="text-gray-600 dark:text-gray-400">()</span>
                            )}
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {func.signature || 'Unknown'}
                          </div>
                        )}
                        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {func.selector}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Fallback: show selectors without enrichment
                    <div className="flex flex-wrap gap-2">
                      {functionSelectors.map((selector, idx) => (
                        <div
                          key={idx}
                          className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-200 dark:border-blue-800"
                        >
                          {selector}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bytecode */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Bytecode
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBytecode(!showBytecode)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showBytecode ? 'Hide' : 'Show'} Raw Bytecode
                  </button>
                  <button
                    onClick={() => setShowOpcodes(!showOpcodes)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showOpcodes ? 'Hide' : 'Show'} Opcodes
                  </button>
                </div>
                {showBytecode && bytecode && (
                  <div className="font-mono text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 break-all max-h-60 overflow-y-auto">
                    {bytecode}
                  </div>
                )}
                {showOpcodes && opcodes.length > 0 && (
                  <div className="font-mono text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    <div className="space-y-1">
                      {opcodes.slice(0, 200).map((op, idx) => (
                        <div key={idx} className="flex gap-4">
                          <span className="text-gray-500 dark:text-gray-400 w-16">
                            0x{op.offset.toString(16).padStart(4, '0')}
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold w-24">
                            {op.opcode}
                          </span>
                          {op.operand && (
                            <span className="text-gray-700 dark:text-gray-300">
                              {op.operand}
                            </span>
                          )}
                        </div>
                      ))}
                      {opcodes.length > 200 && (
                        <div className="text-gray-500 dark:text-gray-400 italic pt-2">
                          ... and {opcodes.length - 200} more opcodes
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// AddressStats component - shows aggregated statistics
function AddressStats({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient()
  const { data: currentBlock } = useBlockNumber()
  const [stats, setStats] = useState<{
    totalReceived: bigint
    totalSent: bigint
    transactionCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient || !currentBlock) return

    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let totalReceived = BigInt(0)
        let totalSent = BigInt(0)
        let txCount = 0

        // Check more blocks for comprehensive stats
        const blocksToCheck = 500
        const blockNumbers: bigint[] = []
        for (let i = 0; i < blocksToCheck && currentBlock - BigInt(i) >= 0; i++) {
          blockNumbers.push(currentBlock - BigInt(i))
        }

        // Fetch blocks in batches to avoid overwhelming the RPC
        const batchSize = 20
        for (let i = 0; i < blockNumbers.length; i += batchSize) {
          const batch = blockNumbers.slice(i, i + batchSize)
          const blockPromises = batch.map(blockNum =>
            publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true })
          )

          const blocks = await Promise.all(blockPromises)

          for (const block of blocks) {
            if (block.transactions) {
              for (const tx of block.transactions) {
                if (typeof tx === 'object') {
                  const isFrom = tx.from?.toLowerCase() === address.toLowerCase()
                  const isTo = tx.to?.toLowerCase() === address.toLowerCase()

                  if (isFrom || isTo) {
                    txCount++
                    const value = tx.value || BigInt(0)

                    if (isFrom) {
                      totalSent += value
                    }
                    if (isTo) {
                      totalReceived += value
                    }
                  }
                }
              }
            }
          }
        }

        setStats({
          totalReceived,
          totalSent,
          transactionCount: txCount,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [publicClient, currentBlock, address])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading statistics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Statistics (Last 500 Blocks)
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Total Value Received
          </label>
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {formatEther(stats.totalReceived)} ETH
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Total Value Sent
          </label>
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {formatEther(stats.totalSent)} ETH
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Transaction Count
          </label>
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {stats.transactionCount.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
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

            {/* Address Overview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Overview
              </label>
              <AddressOverview address={address as `0x${string}`} />
            </div>

            {/* Contract Info (only shown if contract) */}
            <ContractInfo address={address as `0x${string}`} />

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
          </div>
        </div>
      </main>
    </div>
  )
}

