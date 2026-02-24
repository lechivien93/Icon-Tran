#!/bin/bash

# Local Dev Server (Without Shopify Tunnel)
# Use this when Shopify CLI is having connection issues

echo "🚀 Starting Local Dev Server (No Shopify Tunnel)"
echo "================================================"
echo ""
echo "⚠️  Note: Running without Shopify authentication"
echo "    Good for UI testing, but API calls will fail"
echo ""

# Check if build exists
if [ ! -d "build" ]; then
    echo "📦 Building app first..."
    npm run build
fi

echo ""
echo "✅ Starting server on http://localhost:3000"
echo ""
echo "🌐 Access points:"
echo "   - Onboarding: http://localhost:3000/app/onboarding"
echo "   - Dashboard:  http://localhost:3000/app/dashboard"
echo "   - Chat:       http://localhost:3000/app/chat"
echo "   - Settings:   http://localhost:3000/app/settings"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm start
