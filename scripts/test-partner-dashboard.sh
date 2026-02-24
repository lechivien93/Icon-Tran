#!/bin/bash

TUNNEL_URL="https://character-attached-shares-notebooks.trycloudflare.com"
SHOP="test-1-111111111111111472.myshopify.com"

echo "🧪 TESTING OAUTH REDIRECT"
echo "============================================"
echo ""
echo "Testing if Partner Dashboard has correct URLs..."
echo ""

# Test if tunnel is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  echo "❌ TUNNEL NOT ACCESSIBLE"
  echo "   Server may be down. Check: lsof -i :3000"
  exit 1
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
  echo "✅ Tunnel accessible (HTTP $HTTP_CODE)"
else
  echo "⚠️  Tunnel returns HTTP $HTTP_CODE"
fi

echo ""
echo "============================================"
echo "MANUAL VERIFICATION STEPS:"
echo ""
echo "1. Open Partner Dashboard:"
echo "   https://partners.shopify.com/2904518/apps/9765334/edit"
echo ""
echo "2. Check 'App URL':"
echo "   Should be: $TUNNEL_URL"
echo "   NOT: https://example.com"
echo ""
echo "3. Check 'Allowed redirection URL(s)':"
echo "   Should have:"
echo "   - ${TUNNEL_URL}/auth/callback"
echo "   - ${TUNNEL_URL}/api/auth"
echo ""
echo "4. After updating, click SAVE"
echo ""
echo "5. Then reinstall app:"
echo "   Shopify Admin → Apps → IconTrans → Uninstall → Install"
echo ""
echo "============================================"
echo "EXPECTED AFTER REINSTALL:"
echo "  ✅ OAuth permission screen (if scopes changed)"
echo "  ✅ Loading screen 'Welcome to Transcy!'"
echo "  ✅ Progress bar 0% → 100%"
echo "  ✅ Auto redirect → Onboarding"
echo "  ✅ Select plan"
echo ""
echo "If still see 'Example Domain':"
echo "  → Partner Dashboard chưa Save"
echo "  → Hoặc clear browser cache chưa xóa OAuth session"
echo "============================================"
