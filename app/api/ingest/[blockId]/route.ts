import { NextRequest, NextResponse } from 'next/server'
import { ingestBlock } from '@/lib/ingestion/block-ingestion'

/**
 * POST /api/ingest/[blockId]
 * 
 * Fetches a block by block number or hash and ingests all its transactions.
 * The ingestion is idempotent - running it multiple times will not create duplicates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params

    const result = await ingestBlock({ blockId })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error ingesting block:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific error cases
    if (errorMessage.includes('Invalid blockId')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('Block not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to ingest block',
        message: errorMessage 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ingest/[blockId]
 * 
 * Simple GET endpoint that triggers ingestion (useful for testing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  // Delegate to POST handler
  return POST(request, { params })
}

