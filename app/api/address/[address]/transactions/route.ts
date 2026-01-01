import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Fetch transactions where the address is either the sender (from) or recipient (to)
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { from: address },
          { to: address },
        ],
      },
      orderBy: {
        blockNumber: 'desc',
      },
      take: 20, // Limit to 20 most recent transactions
      select: {
        hash: true,
        from: true,
        to: true,
        value: true,
        blockNumber: true,
        timestamp: true,
        status: true,
        gasUsed: true,
        gasPrice: true,
      },
    })

    // Convert BigInt values to strings for JSON serialization
    const serializedTransactions = transactions.map((tx) => ({
      ...tx,
      blockNumber: tx.blockNumber.toString(),
      timestamp: tx.timestamp?.toString() ?? null,
      gasUsed: tx.gasUsed?.toString() ?? null,
    }))

    return NextResponse.json({ transactions: serializedTransactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

