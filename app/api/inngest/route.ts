import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { ingestLatestBlock } from '@/lib/inngest/functions'

/**
 * Inngest API route handler
 * This endpoint receives webhooks from Inngest to trigger background jobs
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ingestLatestBlock,
  ],
})

