#!/bin/bash

# Start All IconTran Services
# Usage: ./scripts/start-all.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting IconTran Services${NC}"
echo "=============================="
echo ""

# Check Redis
echo -n "Checking Redis... "
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}Not running${NC}"
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis started${NC}"
    else
        echo -e "${RED}❌ Failed to start Redis${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Already running${NC}"
fi

echo ""
echo -e "${GREEN}✅ All prerequisites ready!${NC}"
echo ""
echo "Now start the services in separate terminals:"
echo ""
echo -e "${BLUE}Terminal 1:${NC} npm run dev       ${YELLOW}# Shopify app + Vite${NC}"
echo -e "${BLUE}Terminal 2:${NC} npm run worker    ${YELLOW}# Queue workers${NC}"
echo -e "${BLUE}Terminal 3:${NC} npm run prisma studio  ${YELLOW}# Database UI (optional)${NC}"
echo ""
echo "Or use tmux/screen to run all in background:"
echo ""
echo "  tmux new-session -d -s icontran-app 'npm run dev'"
echo "  tmux new-window -t icontran-app:1 'npm run worker'"
echo "  tmux attach -t icontran-app"
echo ""
echo "Run health check: ./scripts/health-check.sh"
echo "Run API tests: ./scripts/test-api.sh"
