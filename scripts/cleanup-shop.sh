#!/bin/bash

# Cleanup Script - Reset shop for testing
# Usage: ./scripts/cleanup-shop.sh <shop-domain>

set -e

SHOP_DOMAIN=${1:-"test-1-111111111111111472.myshopify.com"}

echo "🧹 Cleaning up shop: $SHOP_DOMAIN"
echo "=================================="

# Use Prisma Studio or direct SQL to delete shop data
npx prisma db execute --stdin <<SQL
-- Delete shop and all related data (cascading)
DELETE FROM Shop WHERE shopifyDomain = '$SHOP_DOMAIN';

-- Or just mark as uninstalled
-- UPDATE Shop SET isActive = false, uninstalledAt = datetime('now') WHERE shopifyDomain = '$SHOP_DOMAIN';

-- Delete sessions
DELETE FROM Session WHERE shop = '$SHOP_DOMAIN';
SQL

echo "✅ Cleanup complete for $SHOP_DOMAIN"
echo ""
echo "Now you can reinstall the app to test onboarding flow."
