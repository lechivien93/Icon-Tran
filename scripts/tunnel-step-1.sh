#!/bin/bash

# Simple tunnel setup - 2 commands

echo "🚀 IconTran Tunnel Setup"
echo "========================"
echo ""
echo "STEP 1: Run this first (in THIS terminal):"
echo ""
echo "  npx @react-router/dev vite"
echo ""
echo "STEP 2: Then open NEW terminal and run:"
echo ""
echo "  npx cloudflared tunnel --url http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Starting dev server now..."
echo ""

npx @react-router/dev vite
