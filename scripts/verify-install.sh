#!/bin/bash

# Quick verification script after install flow test

echo "📊 Verifying Install Flow Results..."
echo ""

# Check if prisma is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    exit 1
fi

# Query shop data
echo "🏪 Shop Information:"
npx prisma db execute --stdin <<EOF
SELECT 
    shopifyDomain,
    name,
    email,
    currency,
    timezone,
    plan,
    isActive,
    installedAt
FROM Shop 
ORDER BY installedAt DESC 
LIMIT 1;
EOF

echo ""
echo "🌍 Shop Languages:"
npx prisma db execute --stdin <<EOF
SELECT 
    sl.isDefault,
    sl.isPublished,
    sl.autoTranslate,
    l.code,
    l.name
FROM ShopLanguage sl
JOIN Language l ON sl.languageId = l.id
ORDER BY sl.isDefault DESC;
EOF

echo ""
echo "💳 Subscription Status:"
npx prisma db execute --stdin <<EOF
SELECT 
    ss.status,
    ss.currentPeriodStart,
    ss.currentPeriodEnd,
    bp.name as planName,
    bp.price
FROM ShopSubscription ss
JOIN BillingPlan bp ON ss.planId = bp.id
ORDER BY ss.createdAt DESC
LIMIT 1;
EOF

echo ""
echo "💰 Token Wallet:"
npx prisma db execute --stdin <<EOF
SELECT 
    balance,
    lifetimeSpent,
    createdAt
FROM TokenWallet
ORDER BY createdAt DESC
LIMIT 1;
EOF

echo ""
echo "✅ Verification complete!"
echo ""
echo "Expected results:"
echo "   ✓ Shop: name, email, currency, timezone filled"
echo "   ✓ Shop: isActive = 1 (true)"
echo "   ✓ ShopLanguage: At least 1 language with isDefault = 1"
echo "   ✓ Subscription: status = ACTIVE, planName = Free"
echo "   ✓ TokenWallet: balance = 0 (for free plan)"
