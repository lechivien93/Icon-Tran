#!/bin/bash

echo "🔍 DEBUG: URLs Configuration"
echo "============================================"
echo ""

echo "1️⃣  .env SHOPIFY_APP_URL:"
grep "SHOPIFY_APP_URL" .env | cut -d'=' -f2
echo ""

echo "2️⃣  shopify.app.toml URLs:"
grep -E "application_url|redirect_urls" shopify.app.toml
echo ""

echo "3️⃣  Database status:"
sqlite3 prisma/dev.sqlite "SELECT COUNT(*) as shop_count FROM Shop;" 2>/dev/null || echo "DB error"
echo ""

echo "4️⃣  Expected flow:"
echo "   OAuth → app._index → /app/install (no shop)"
echo "   → Loading screen → /app/onboarding"
echo "   → Select plan → Dashboard"
echo ""

echo "5️⃣  Current dev server:"
ps aux | grep "shopify app dev" | grep -v grep | awk '{print "   PID:", $2, "- Running ✅"}' || echo "   Not running ❌"
echo ""

echo "============================================"
echo "Next steps:"
echo "1. Restart: npm run dev"
echo "2. Check terminal for tunnel URL"
echo "3. Verify Partner Dashboard URLs match"
echo "4. Uninstall + Reinstall app"
echo "============================================"
