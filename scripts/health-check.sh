#!/bin/bash

# Health Check Script for IconTran App
# Usage: ./scripts/health-check.sh

set -e

echo "🔍 IconTran Health Check"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Redis
echo -n "🔴 Redis Connection: "
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "   → Start Redis: redis-server"
    exit 1
fi

# Check App Server
echo -n "🌐 App Server (http://localhost:3000): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Not Running${NC}"
    echo "   → Start app: npm run dev"
fi

# Check Database
echo -n "🗄️  Database Connection: "
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "   → Run migrations: npm run prisma migrate dev"
    exit 1
fi

# Check Queue Status
echo ""
echo "📊 Queue Status:"
echo "  Sync Queue:"
SYNC_WAITING=$(redis-cli LLEN "bull:sync:waiting" 2>/dev/null || echo "0")
SYNC_ACTIVE=$(redis-cli LLEN "bull:sync:active" 2>/dev/null || echo "0")
echo "    - Waiting: $SYNC_WAITING jobs"
echo "    - Active: $SYNC_ACTIVE jobs"

echo "  Translation Queue:"
TRANS_WAITING=$(redis-cli LLEN "bull:translation:waiting" 2>/dev/null || echo "0")
TRANS_ACTIVE=$(redis-cli LLEN "bull:translation:active" 2>/dev/null || echo "0")
echo "    - Waiting: $TRANS_WAITING jobs"
echo "    - Active: $TRANS_ACTIVE jobs"

echo "  Webhook Queue:"
WEBHOOK_WAITING=$(redis-cli LLEN "bull:webhook:waiting" 2>/dev/null || echo "0")
WEBHOOK_ACTIVE=$(redis-cli LLEN "bull:webhook:active" 2>/dev/null || echo "0")
echo "    - Waiting: $WEBHOOK_WAITING jobs"
echo "    - Active: $WEBHOOK_ACTIVE jobs"

echo ""
echo -e "${GREEN}✨ Health check complete!${NC}"
