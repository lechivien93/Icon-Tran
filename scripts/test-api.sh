#!/bin/bash

# API Test Script for IconTran
# Usage: ./scripts/test-api.sh

set -e

API_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧪 IconTran API Test Suite"
echo "=========================="
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${BLUE}Testing:${NC} $description"
    echo "  → $method $API_URL$endpoint"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✅ Success ($http_code)${NC}"
        echo "  Response: $(echo $body | jq -r '.' 2>/dev/null || echo $body)"
    else
        echo -e "  ${RED}❌ Failed ($http_code)${NC}"
        echo "  Response: $body"
    fi
    echo ""
}

# Check if server is running
echo -n "Checking server... "
if ! curl -s -o /dev/null http://localhost:3000; then
    echo -e "${RED}Server not running!${NC}"
    echo "Start server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# Test Sync API
echo "📦 Sync API Tests"
echo "-----------------"
test_endpoint "GET" "/api/sync" "" "Get sync history"

test_endpoint "POST" "/api/sync" \
    '{"resourceType":"PRODUCT","operation":"FULL_SYNC"}' \
    "Start product sync"

# Test Billing API
echo "💳 Billing API Tests"
echo "--------------------"
test_endpoint "GET" "/api/billing" "" "Get billing plans and subscription"

# Test Resources API
echo "📚 Resources API Tests"
echo "----------------------"
test_endpoint "GET" "/api/resources?page=1&limit=10" "" "Get resources (paginated)"

test_endpoint "GET" "/api/resources?type=PRODUCT&status=ACTIVE" "" "Get filtered resources"

# Test Chat API (requires valid conversation)
echo "💬 Chat API Tests"
echo "-----------------"
test_endpoint "GET" "/api/chat" "" "Get chat conversations"

test_endpoint "POST" "/api/chat" \
    '{"message":"What is my token balance?"}' \
    "Send chat message"

echo -e "${GREEN}✨ All tests completed!${NC}"
