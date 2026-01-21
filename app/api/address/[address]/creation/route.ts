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

    const normalizedAddress = address.toLowerCase()

    const creation = await prisma.transaction.findFirst({
      where: {
        contractAddress: normalizedAddress,
      },
      orderBy: {
        blockNumber: 'asc',
      },
      select: {
        hash: true,
        blockNumber: true,
        timestamp: true,
        from: true,
      },
    })

    if (!creation) {
      return NextResponse.json({ creation: null })
    }

    return NextResponse.json({
      creation: {
        hash: creation.hash,
        blockNumber: creation.blockNumber.toString(),
        timestamp: creation.timestamp?.toString() ?? null,
        creator: creation.from,
      },
    })
  } catch (error) {
    console.error('Error fetching contract creation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract creation' },
      { status: 500 }
    )
  }
}
