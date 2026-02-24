#!/bin/bash

# Test Install & Onboarding Flow
# No Shopify CLI tunnel needed - works with VPN/firewall

set -e

echo "🧪 IconTran - Install Flow Test Guide"
echo "======================================"
echo ""
echo "📋 Prerequisites:"
echo "   ✓ App already created in Partner Dashboard"
echo "   ✓ App already installed on dev store"
echo "   ✓ Local server ready to start"
echo ""
echo "🚀 Test Steps:"
echo ""
echo "1. Uninstall App (Shopify Admin)"
echo "   → Settings → Apps and sales channels"
echo "   → Click '[STAGING] Transcy' → Uninstall"
echo "   → Confirm uninstall"
echo ""
echo "2. Cleanup Database (optional - test fresh install)"
read -p "   Delete shop data? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/cleanup-shop.sh
fi
echo ""
echo "3. Start Local Server"
echo "   Starting server on http://localhost:3000..."
npm start &
SERVER_PID=$!
echo "   → Server PID: $SERVER_PID"
echo ""
echo "4. Wait for server to start (5 seconds)..."
sleep 5
echo ""
echo "5. Reinstall App"
echo "   → Open Shopify Admin"
echo "   → Apps → Add app"
echo "   → Search '[STAGING] Transcy'"
echo "   → Click Install"
echo ""
echo "6. Expected Install Flow:"
echo "   ✓ OAuth redirect to /auth"
echo "   ✓ Redirect to /app/install"
echo "   ✓ Loading screen 'Welcome to Transcy!' (3 seconds)"
echo "   ✓ Progress bar animation (0% → 100%)"
echo "   ✓ 5 steps with checkmarks:"
echo "      - Connecting to your store..."
echo "      - Fetching store information..."
echo "      - Setting up your account..."
echo "      - Configuring languages..."
echo "      - Almost ready..."
echo "   ✓ Auto-redirect to /app/onboarding"
echo "   ✓ Plan selection screen (4 plans)"
echo ""
echo "7. Test Onboarding:"
echo "   → Select 'Free' plan"
echo "   → Click 'Confirm Subscription'"
echo "   → Expect: Immediate redirect to dashboard"
echo ""
echo "8. Verify Database:"
echo "   → Run: npm run prisma studio"
echo "   → Check Shop table:"
echo "      - shopifyDomain = vien-dev-v4.myshopify.com"
echo "      - name, email, currency, timezone filled"
echo "      - isActive = true"
echo "   → Check ShopLanguage table:"
echo "      - Primary language configured"
echo "   → Check ShopSubscription table:"
echo "      - status = ACTIVE"
echo "      - planId = Free plan ID"
echo ""
echo "📊 Server Logs:"
echo "   Watch terminal for:"
echo "   ✅ Shop xxx initialized successfully"
echo "   ✅ Default language en configured"
echo "   ✅ Subscription created: Free plan"
echo ""
echo "Press Ctrl+C to stop server when done testing"
echo ""

# Keep script running
wait $SERVER_PID
