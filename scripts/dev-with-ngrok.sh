#!/bin/bash

# Complete development setup with ngrok tunnel
# No Shopify CLI authentication needed!

set -e

echo "🚀 IconTran Development Server (ngrok tunnel)"
echo "=============================================="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not installed"
    echo ""
    echo "📥 Install ngrok:"
    echo "   brew install ngrok"
    echo ""
    echo "Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

# Check if build exists, if not - build
if [ ! -d "build" ]; then
    echo "📦 Building app..."
    npm run build
    echo ""
fi

echo "✅ Starting development setup..."
echo ""

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start React Router server in background
echo "1️⃣  Starting React Router server (port 3000)..."
npm run start &
SERVER_PID=$!

# Wait for server to start
echo "   Waiting for server..."
sleep 3

# Start ngrok tunnel
echo ""
echo "2️⃣  Starting ngrok tunnel..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ngrok http 3000 --log=stdout 2>&1 | while IFS= read -r line; do
    # Extract tunnel URL from ngrok output
    if echo "$line" | grep -q "url=https://"; then
        TUNNEL_URL=$(echo "$line" | grep -o 'url=https://[^"]*' | cut -d= -f2)
        echo "✅ TUNNEL READY: $TUNNEL_URL"
        echo ""
        echo "📝 NEXT STEPS:"
        echo ""
        echo "   1. Update Shopify Partner Dashboard:"
        echo "      → Apps → IconTrans → Configuration"
        echo "      → App URL: $TUNNEL_URL"
        echo "      → Allowed redirection URL(s): $TUNNEL_URL/api/auth"
        echo ""
        echo "   2. Install/Access app from Shopify Admin:"
        echo "      → https://admin.shopify.com/store/YOUR_STORE/apps"
        echo ""
        echo "   3. Watch terminal for install flow logs"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi
    echo "$line"
done

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null" EXIT
