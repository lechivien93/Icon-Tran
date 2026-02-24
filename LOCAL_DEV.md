# Local Development Without Shopify Tunnel

## Problem
Shopify CLI `npm run dev` fails with ECONNRESET error.

## Quick Fix: Local Dev Mode

### 1. Run Remix Dev Server Directly

```bash
# Terminal 1: Build and start server
npm run build
npm start

# Or use Vite dev mode (faster)
npx vite dev
```

### 2. Update .env for Local Testing

```bash
# Add to .env
SHOPIFY_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Access App

Open browser: http://localhost:3000/app/onboarding

**Note**: This runs WITHOUT Shopify authentication, good for UI testing only.

## Alternative: Fix Shopify CLI

### Option 1: Clear Shopify Cache

```bash
rm -rf ~/.shopify
rm -rf node_modules/.shopify
shopify auth login
```

### Option 2: Check VPN/Proxy

```bash
# Disable VPN if active
# Check system proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Unset if exists
unset HTTP_PROXY
unset HTTPS_PROXY
```

### Option 3: Wait and Retry

Shopify API có thể tạm thời down. Check status:
- https://www.shopifystatus.com/

Retry sau 5-10 phút:
```bash
npm run dev
```

### Option 4: Use Different Network

Try:
- Switch WiFi network
- Use mobile hotspot
- Disable corporate VPN/firewall

## For Production Testing (Need Shopify Tunnel)

If you MUST test with real Shopify store:

### Use ngrok as alternative tunnel

```bash
# Install ngrok
brew install ngrok

# Terminal 1: Start app
npm start

# Terminal 2: Create tunnel
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update in Shopify Partner Dashboard:
# App setup → URLs → App URL
```

Then access via Shopify Admin with ngrok URL.

## Current Status

```
✅ Ping to Shopify: OK (52ms)
❌ Shopify CLI OAuth: ECONNRESET
❌ Shopify CLI GraphQL: ECONNRESET
```

**Most Likely Cause**: VPN, corporate firewall, or temporary Shopify API issue.

**Best Solution**: 
1. Disable VPN/proxy
2. Retry `npm run dev`
3. Or use ngrok tunnel as alternative
