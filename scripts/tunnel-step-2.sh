#!/bin/bash

# Tunnel step 2 - Run in separate terminal

echo "🌐 Starting Cloudflare Tunnel..."
echo ""
echo "This will create a public URL for your app"
echo ""

npx cloudflared tunnel --url http://localhost:5173
