#!/bin/bash

# Run IconTran without Shopify CLI
# Bypasses ECONNRESET authentication error

set -e

echo "🚀 Starting IconTran (No CLI Required)"
echo "======================================"
echo ""

# Check if build exists
if [ ! -d "build" ]; then
    echo "📦 Building app first..."
    npm run build
    echo ""
fi

echo "✅ Starting server on http://localhost:3000"
echo ""
echo "⚠️  IMPORTANT:"
echo "   This runs LOCAL SERVER only (no tunnel)"
echo "   App CANNOT be accessed from Shopify Admin with this mode"
echo ""
echo "📝 To test install flow, you need:"
echo "   1. Setup ngrok tunnel (see LOCAL_DEV.md)"
echo "   2. OR access via Shopify Partner Dashboard (if app already deployed)"
echo "   3. OR wait for Shopify CLI connection to be fixed"
echo ""
echo "🔧 For development with auto-reload:"
echo "   - Fix Shopify CLI login (disable VPN)"
echo "   - OR use ngrok: ngrok http 3000"
echo ""
echo "Press Ctrl+C to stop server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run start
