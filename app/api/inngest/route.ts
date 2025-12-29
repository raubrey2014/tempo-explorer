import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { ingestLatestBlock } from '@/lib/inngest/functions'

// Ensure this route uses Node.js runtime (not Edge)
export const runtime = 'nodejs'

/**
 * Inngest API route handler
 * 
 * GET: Used by Inngest to sync/discover functions (required for registration)
 * POST: Used to trigger function executions
 * PUT: Used to update function configurations
 * 
 * This endpoint must be publicly accessible for Inngest to sync your functions.
 * Make sure to configure INNGEST_SIGNING_KEY in your environment variables.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ingestLatestBlock,
  ],
})

