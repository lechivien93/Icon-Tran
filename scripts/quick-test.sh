#!/bin/bash

# Quick Test - Access app directly in browser
# For when Shopify CLI is having issues

echo "🧪 Quick Test Mode"
echo "=================="
echo ""
echo "Since Shopify CLI has connection issues,"
echo "you can still test the app by accessing it directly:"
echo ""
echo "🌐 Open in browser:"
echo "   https://admin.shopify.com/store/test-1-111111111111111472/apps/icontrans"
echo ""
echo "Or manually enter your store URL:"
echo "   https://admin.shopify.com/store/YOUR-STORE-NAME/apps/APP-HANDLE"
echo ""
echo "📝 Note: The app must be installed on your store first."
echo ""
echo "💡 Alternative: Use ngrok for local testing"
echo "   1. npm run build && npm start"
echo "   2. ngrok http 3000"
echo "   3. Update App URL in Partner Dashboard with ngrok URL"
echo ""
