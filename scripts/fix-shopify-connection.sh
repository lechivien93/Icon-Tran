#!/bin/bash

# Fix Shopify CLI Connection Issues
# Run this to bypass ECONNRESET errors

echo "🔧 Fixing Shopify CLI Connection..."
echo ""

# 1. Check current network config
echo "📡 Current Network Config:"
echo "  HTTP_PROXY: ${HTTP_PROXY:-<not set>}"
echo "  HTTPS_PROXY: ${HTTPS_PROXY:-<not set>}"
echo ""

# 2. Unset proxy if exists
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    echo "🧹 Clearing proxy settings..."
    unset HTTP_PROXY
    unset HTTPS_PROXY
    export NO_PROXY="*"
    echo "✅ Proxy cleared"
    echo ""
fi

# 3. Clear Shopify cache
echo "🗑️  Clearing Shopify CLI cache..."
rm -rf ~/.shopify 2>/dev/null
rm -rf ~/.config/shopify 2>/dev/null
rm -rf node_modules/.shopify 2>/dev/null
echo "✅ Cache cleared"
echo ""

# 4. Test connection
echo "🌐 Testing Shopify connection..."
if curl -s --max-time 5 https://accounts.shopify.com > /dev/null; then
    echo "✅ Connection OK"
else
    echo "❌ Connection failed - VPN/Firewall may be blocking"
    echo ""
    echo "💡 Solutions:"
    echo "   1. Disable VPN/corporate proxy"
    echo "   2. Try different WiFi network"
    echo "   3. Use mobile hotspot"
    echo "   4. Use ngrok tunnel (see LOCAL_DEV.md)"
    echo ""
    exit 1
fi

echo ""
echo "✨ Ready! Now try:"
echo "   npm run dev"
echo ""
