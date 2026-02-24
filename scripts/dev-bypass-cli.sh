#!/bin/bash

# Development server WITHOUT Shopify CLI
# Uses Vite directly + manual tunnel

set -e

echo "🚀 IconTran Dev Server (Bypass Shopify CLI)"
echo "============================================"
echo ""

# Step 1: Start Vite dev server
echo "1️⃣  Starting Vite dev server..."
echo ""

# Create vite dev script if not exists
cat > .vite-dev.js << 'EOF'
import { createServer } from 'vite';
import { defineConfig } from 'vite';

const config = defineConfig({
  server: {
    port: 3000,
    host: true,
    strictPort: true,
  },
});

const server = await createServer(config);
await server.listen();

server.printUrls();
EOF

# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start Vite in background
echo "   Starting on port 3000..."
npx vite --port 3000 --host &
VITE_PID=$!

# Wait for Vite to start
sleep 5

echo ""
echo "✅ Vite server running on http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2️⃣  Creating tunnel..."
echo ""
echo "Choose tunnel method:"
echo ""
echo "   A. Cloudflared (recommended - built-in)"
echo "   B. ngrok (if installed)"
echo "   C. Skip tunnel (local only)"
echo ""
read -p "Select (A/B/C): " choice

case $choice in
  [Aa])
    echo ""
    echo "Starting cloudflared tunnel..."
    npx cloudflared tunnel --url http://localhost:3000
    ;;
  [Bb])
    if command -v ngrok &> /dev/null; then
      echo ""
      echo "Starting ngrok tunnel..."
      ngrok http 3000
    else
      echo "❌ ngrok not installed. Install: brew install ngrok"
      kill $VITE_PID
      exit 1
    fi
    ;;
  [Cc])
    echo ""
    echo "⚠️  Running local only - no tunnel"
    echo ""
    echo "App available at: http://localhost:3000"
    echo "Cannot be accessed from Shopify Admin"
    echo ""
    echo "Press Ctrl+C to stop"
    wait $VITE_PID
    ;;
  *)
    echo "Invalid choice"
    kill $VITE_PID
    exit 1
    ;;
esac

# Cleanup
trap "kill $VITE_PID 2>/dev/null" EXIT
