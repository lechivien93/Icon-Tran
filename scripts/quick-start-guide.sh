#!/bin/bash

# Quick Guide - 3 Options to Run App

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IconTran - How to Run App (ECONNRESET Workaround)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "❌ PROBLEM: npm run dev fails with ECONNRESET"
echo "   Cause: VPN/firewall blocks Shopify CLI authentication"
echo ""
echo "✅ SOLUTION: 3 Options (choose ONE)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 OPTION 1: Quick Test (ngrok) - RECOMMENDED"
echo ""
echo "   If you have ngrok installed:"
echo ""
echo "   1. Install ngrok (if needed):"
echo "      brew install ngrok"
echo "      # or download from: https://ngrok.com/download"
echo ""
echo "   2. Run dev server:"
echo "      ./scripts/dev-with-ngrok.sh"
echo ""
echo "   3. Copy tunnel URL from output"
echo ""
echo "   4. Update Partner Dashboard:"
echo "      → https://partners.shopify.com/"
echo "      → Apps → IconTrans → Configuration"  
echo "      → App URL: [paste tunnel URL]"
echo "      → Redirect URLs: [tunnel URL]/api/auth"
echo ""
echo "   5. Access app from Shopify Admin"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🆓 OPTION 2: Free Tunnel (cloudflared)"
echo ""
echo "   No installation needed:"
echo ""
echo "   Terminal 1:"
echo "      npm run build"
echo "      npm start"
echo ""
echo "   Terminal 2:"
echo "      npx cloudflared tunnel --url http://localhost:3000"
echo ""
echo "   Then follow steps 3-5 from Option 1"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 OPTION 3: Fix VPN/Network (permanent fix)"
echo ""
echo "   1. Disable VPN/corporate proxy"
echo "   2. Try different WiFi network"
echo "   3. Use mobile hotspot"
echo "   4. Then run: npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 TIPS:"
echo ""
echo "   - Option 1 (ngrok) is best for development"
echo "   - Option 2 (cloudflared) is FREE but URL changes each time"
echo "   - Option 3 fixes root cause but may not be possible"
echo ""
echo "   After tunnel starts:"
echo "   → Test install flow as documented in INSTALL_FLOW.md"
echo "   → Watch terminal for install logs"
echo "   → Verify database: ./scripts/verify-install.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Which option do you want to try? (1/2/3/q to quit): " choice

case $choice in
  1)
    echo ""
    if command -v ngrok &> /dev/null; then
      echo "✅ ngrok found - starting..."
      ./scripts/dev-with-ngrok.sh
    else
      echo "❌ ngrok not installed"
      echo ""
      echo "Install with: brew install ngrok"
      echo "Or download from: https://ngrok.com/download"
    fi
    ;;
  2)
    echo ""
    echo "Starting cloudflared tunnel in 5 seconds..."
    echo "First, building and starting server..."
    echo ""
    npm run build
    npm start &
    SERVER_PID=$!
    sleep 5
    echo ""
    echo "Starting tunnel (press Ctrl+C to stop)..."
    npx cloudflared tunnel --url http://localhost:3000
    kill $SERVER_PID 2>/dev/null
    ;;
  3)
    echo ""
    echo "Fix your network connection, then run:"
    echo "  npm run dev"
    ;;
  [Qq])
    echo "Exiting..."
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
