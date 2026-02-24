#!/bin/bash

echo "🔍 COMPLETE CONFIG VERIFICATION"
echo "============================================"
echo ""

echo "1️⃣  URLs Configuration:"
echo "---"
echo ".env SHOPIFY_APP_URL:"
grep "^SHOPIFY_APP_URL=" .env | cut -d'=' -f2
echo ""
echo "shopify.app.toml application_url:"
grep "^application_url" shopify.app.toml | cut -d'=' -f2 | tr -d ' "'
echo ""
echo "shopify.app.toml redirect_urls:"
grep -A2 "redirect_urls" shopify.app.toml | grep "http" | tr -d ' ",'
echo ""

echo "2️⃣  Scopes Configuration:"
echo "---"
echo ".env:"
grep "^SCOPES=" .env | cut -d'=' -f2
echo ""
echo "shopify.app.toml:"
grep "^scopes =" shopify.app.toml | cut -d'=' -f2 | tr -d ' "'
echo ""

echo "3️⃣  API Credentials:"
echo "---"
echo "API Key (.env):"
grep "^SHOPIFY_API_KEY=" .env | cut -d'=' -f2
echo ""
echo "Client ID (toml):"
grep "^client_id" shopify.app.toml | cut -d'=' -f2 | tr -d ' "'
echo ""
echo "Match: $([ "$(grep '^SHOPIFY_API_KEY=' .env | cut -d'=' -f2)" = "$(grep '^client_id' shopify.app.toml | cut -d'=' -f2 | tr -d ' \"')" ] && echo '✅ YES' || echo '❌ NO')"
echo ""

echo "4️⃣  Embedded Mode:"
echo "---"
grep "^embedded" shopify.app.toml
echo ""

echo "5️⃣  Database State:"
echo "---"
SHOP_COUNT=$(sqlite3 prisma/dev.sqlite "SELECT COUNT(*) FROM Shop;" 2>/dev/null || echo "0")
SUB_COUNT=$(sqlite3 prisma/dev.sqlite "SELECT COUNT(*) FROM ShopSubscription;" 2>/dev/null || echo "0")
echo "Shops: $SHOP_COUNT"
echo "Subscriptions: $SUB_COUNT"
echo ""

echo "6️⃣  Dev Server:"
echo "---"
ps aux | grep "shopify app dev" | grep -v grep | awk '{print "PID:", $2, "- Running ✅"}' || echo "Not running ❌"
echo ""

echo "============================================"
echo "EXPECTED VALUES:"
echo "  ✅ All URLs use same tunnel domain"
echo "  ✅ Scopes match between .env and toml"
echo "  ✅ API Key = Client ID"
echo "  ✅ embedded = true"
echo "  ✅ Database empty (0 shops for fresh install)"
echo "  ✅ Dev server running"
echo "============================================"
echo ""

echo "🎯 NEXT STEPS:"
echo "1. Hard refresh browser (Cmd+Shift+R)"
echo "2. Or reopen app from Shopify Admin → Apps → IconTrans"
echo "3. Should see OAuth permission screen (if first time)"
echo "4. Then should see loading screen + onboarding"
echo ""
echo "If still stuck at login form:"
echo "  → Check browser Network tab for errors"
echo "  → Check terminal for OAuth errors"
echo "  → Paste both here for debugging"
echo "============================================"
