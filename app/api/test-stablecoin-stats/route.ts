import { NextRequest, NextResponse } from 'next/server'
import { getPublicClient } from '@/lib/blockchain-client'
import { calculateStablecoinStats } from '@/lib/ingestion/stablecoin-stats'
import { detectAndIngestStablecoins } from '@/lib/ingestion/stablecoin-ingestion'
import type { TransactionReceipt } from 'viem'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { txHash } = body

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    const client = getPublicClient()

    // Fetch transaction and receipt
    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash as `0x${string}` }),
      client.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null),
    ])

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (!receipt) {
      return NextResponse.json(
        { error: 'Transaction receipt not found' },
        { status: 404 }
      )
    }

    // Get block to get timestamp
    const block = await client.getBlock({
      blockNumber: receipt.blockNumber,
    })

    // Detect and ingest stablecoins from this transaction
    const contractAddresses: string[] = []
    if (receipt.contractAddress) {
      contractAddresses.push(receipt.contractAddress)
    }
    if (transaction.to) {
      contractAddresses.push(transaction.to)
    }

    let stablecoinsDetected = 0
    if (contractAddresses.length > 0) {
      try {
        stablecoinsDetected = await detectAndIngestStablecoins(
          contractAddresses,
          receipt.blockNumber,
          block.timestamp,
          client
        )
      } catch (error) {
        console.error('Error detecting stablecoins:', error)
      }
    }

    // Calculate stats for this single transaction
    const stats = await calculateStablecoinStats(
      [receipt as any],
      receipt.blockNumber
    )

    // Format the response
    return NextResponse.json({
      success: true,
      transaction: {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        blockNumber: receipt.blockNumber.toString(),
        blockHash: receipt.blockHash,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: (receipt as any).effectiveGasPrice?.toString(),
        feeToken: (receipt as any).feeToken,
      },
      receipt: {
        logs: receipt.logs?.map((log) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
        })),
        feeToken: (receipt as any).feeToken,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: (receipt as any).effectiveGasPrice?.toString(),
      },
      stablecoinsDetected,
      stats: Object.values(stats).map((stat) => ({
        address: stat.address,
        transferCount: stat.transferCount,
        transferVolume: stat.transferVolume.toString(),
        feePaymentCount: stat.feePaymentCount,
        feeVolume: stat.feeVolume.toString(),
      })),
    })
  } catch (error) {
    console.error('Error processing transaction:', error)
    return NextResponse.json(
      {
        error: 'Failed to process transaction',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

