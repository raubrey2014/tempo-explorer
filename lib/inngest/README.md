# Inngest Setup for Tempo Explorer

This directory contains the Inngest configuration for background job processing, specifically for ingesting blockchain blocks.

## Files

- `client.ts` - Inngest client instance
- `functions.ts` - Background job functions (cron jobs, event handlers, etc.)

## Functions

### `ingestLatestBlock`

A cron job that runs every 5 minutes to ingest the latest block from the Tempo blockchain.

- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Function ID**: `ingest-latest-block`
- **Endpoint**: `/api/inngest` (handled by `app/api/inngest/route.ts`)

## Deployment to Vercel

### 1. Install Inngest Vercel Integration

The easiest way to set up Inngest on Vercel is to install the official integration:

1. Go to [Vercel Marketplace - Inngest](https://vercel.com/marketplace/inngest)
2. Click "Add Integration" for your project
3. Follow the setup wizard

This will automatically:
- Set the required environment variables (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`)
- Sync your app with Inngest on each deployment

### 2. Manual Setup (Alternative)

If you prefer manual setup:

1. **Get your Inngest keys** from the [Inngest Dashboard](https://app.inngest.com)
2. **Add environment variables** in Vercel:
   - `INNGEST_SIGNING_KEY` - Your Inngest signing key
   - `INNGEST_EVENT_KEY` (optional) - For sending events to Inngest
3. **Deploy your application**
4. **Sync your app** manually (see step 3 below)

### 3. Sync Your App with Inngest

After deployment, you need to sync your app with Inngest so it can discover your functions:

#### Option A: Via Inngest Dashboard
1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Navigate to your environment
3. Go to "Apps" page
4. Click "Sync App" or "Sync New App"
5. Enter your app's serve endpoint URL: `https://your-app.vercel.app/api/inngest`
6. Click "Sync App"

#### Option B: Via cURL
```bash
curl -X PUT https://your-app.vercel.app/api/inngest --fail-with-body
```

### 4. Deployment Protection

If you have Vercel Deployment Protection enabled, it may block Inngest from accessing your app. You have two options:

**Option A: Disable Deployment Protection**
- Go to your Vercel project settings
- Disable Deployment Protection

**Option B: Configure Protection Bypass** (Vercel Pro plan required)
1. In Vercel project settings, enable "Protection Bypass for Automation"
2. Generate a bypass secret
3. Add the secret to Inngest dashboard under Vercel integration settings

See [Inngest Vercel Documentation](https://www.inngest.com/docs/deploy/vercel) for details.

### 5. Verify Function Registration

After syncing, verify your functions are registered:

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Navigate to "Functions" page
3. You should see `ingest-latest-block` listed

## Local Development

For local development, use the Inngest Dev Server:

```bash
npx inngest-cli@latest dev
```

This starts a local Inngest server that your Next.js app can connect to. Your functions will be automatically discovered when you run `npm run dev`.

## Monitoring

- **Inngest Dashboard**: View function executions, logs, and retries at [app.inngest.com](https://app.inngest.com)
- **Vercel Logs**: Check Vercel function logs for any runtime errors
- **Application Logs**: The function includes logging via the `logger` parameter

## Troubleshooting

### Functions not appearing after deployment

1. ✅ Verify Inngest Vercel integration is installed
2. ✅ Check that `/api/inngest` endpoint is accessible (should return 200 on GET)
3. ✅ Ensure Deployment Protection is disabled or bypass is configured
4. ✅ Manually sync your app (see step 3 above)
5. ✅ Check environment variables are set correctly
6. ✅ Review deployment logs in both Vercel and Inngest dashboards

### Functions not executing

1. ✅ Verify the function is registered in Inngest dashboard
2. ✅ Check function logs in Inngest dashboard
3. ✅ Verify cron schedule is correct
4. ✅ Check application logs for errors

### Endpoint returning errors

1. ✅ Verify `INNGEST_SIGNING_KEY` is set correctly
2. ✅ Check that all imports are correct
3. ✅ Ensure database connection is working
4. ✅ Verify blockchain RPC endpoint is accessible

