# Install & Onboarding Flow Documentation

## 🎯 Overview

Flow từ **install app** → **onboarding** → **billing** → **dashboard** theo đúng chuẩn Shopify App.

---

## 📊 Complete Install Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Install" in Shopify App Store                 │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Shopify shows modal "Install app"                          │
│    - Permissions: View personal data, Edit store data         │
│    - User clicks "Install" button                             │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. OAuth Flow (auth.$.tsx)                                    │
│    - Shopify redirects to /auth?shop=xxx                      │
│    - authenticate.admin(request)                               │
│    - Session created in database                               │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Redirect to app._index.tsx                                 │
│    - Check if shop exists in DB                                │
│    - Decision: First install OR Reinstall OR Configured        │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
         ┌───────────┴───────────┬───────────────────┐
         ▼                       ▼                   ▼
┌──────────────────┐   ┌──────────────────┐   ┌────────────────┐
│ No Shop in DB    │   │ Shop Inactive    │   │ Shop + Active  │
│ → First Install  │   │ → Reinstall      │   │ Subscription   │
└────────┬─────────┘   └─────────┬────────┘   └───────┬────────┘
         │                       │                     │
         └───────────┬───────────┘                     │
                     ▼                                 ▼
         ┌────────────────────────┐          ┌────────────────┐
         │ /app/install           │          │ /app/dashboard │
         │ (Loading Screen)       │          │ (Skip onboard) │
         └────────┬───────────────┘          └────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. app/install - Shop Initialization (2-3 seconds)            │
│                                                                 │
│    Loading Screen UI:                                          │
│    - Logo + "Welcome to Transcy!"                              │
│    - Progress bar (animated 0% → 100%)                         │
│    - Steps with checkmarks:                                    │
│      ✓ Connecting to your store...                            │
│      ✓ Fetching store information...                          │
│      ✓ Setting up your account...                             │
│      ✓ Configuring languages...                               │
│      ✓ Almost ready...                                         │
│                                                                 │
│    Backend Processing:                                         │
│    1. Fetch shop info from Shopify GraphQL:                    │
│       - shop.name, email, currency, timezone, plan             │
│       - shopLocales (primary language)                         │
│    2. Create/Update Shop in database:                          │
│       - shopifyDomain, name, email, currency, timezone         │
│       - isActive = true, uninstalledAt = null                  │
│    3. Initialize default ShopLanguage:                         │
│       - Primary language from Shopify                          │
│       - isDefault = true, isPublished = true                   │
│    4. Handle reinstall scenario:                               │
│       - Cancel old subscription (if exists)                    │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Auto-redirect to /app/onboarding (after 3 seconds)         │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. app/onboarding - Plan Selection (3 steps)                  │
│                                                                 │
│    Step 1: Welcome                                             │
│    - "Start translating your store in 3 steps"                 │
│    - Feature highlights (3 cards)                              │
│                                                                 │
│    Step 2: Choose Your Plan                                    │
│    - 4 plan cards: Free, Basic, Professional, Enterprise      │
│    - Badge: "Popular", "Best Value", "Recommended"            │
│    - Features comparison                                       │
│    - User selects plan                                         │
│                                                                 │
│    Step 3: Confirmation                                        │
│    - Show selected plan details                                │
│    - "Confirm Subscription" button                             │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│ Free Plan        │   │ Paid Plan            │
│ (price = 0)      │   │ (Basic/Pro/Ent)      │
└────────┬─────────┘   └─────────┬────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│ Direct Activate  │   │ Shopify Billing      │
│ - Create         │   │ - Create charge      │
│   subscription   │   │ - Return             │
│   status=ACTIVE  │   │   confirmationUrl    │
│ - Create         │   └─────────┬────────────┘
│   TokenWallet    │             ▼
│ - Redirect to    │   ┌──────────────────────┐
│   dashboard      │   │ User approves        │
└──────────────────┘   │ in Shopify Admin     │
                       └─────────┬────────────┘
                                 ▼
                       ┌──────────────────────┐
                       │ app/billing/callback │
                       │ - Confirm charge     │
                       │ - Activate sub       │
                       │ - Create wallet      │
                       │ - Redirect dashboard │
                       └─────────┬────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. /app/dashboard - User enters app                           │
│    - Full access to translation features                       │
│    - Subscription active                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure & Responsibilities

### Route Files

#### `app/routes/auth.$.tsx`
- **Purpose**: OAuth callback handler
- **Responsibilities**:
  - Authenticate with Shopify
  - Create session in database
  - Redirect to app
- **Does NOT**: Create shop data

#### `app/routes/app._index.tsx`
- **Purpose**: Entry point router
- **Responsibilities**:
  - Check shop existence and status
  - Determine user flow:
    - No shop → `/app/install`
    - Shop inactive → `/app/install`
    - No subscription → `/app/onboarding`
    - Has subscription → `/app/dashboard`
- **Logic**:
  ```typescript
  if (!shop || shop.uninstalledAt || !shop.isActive) {
    return redirect("/app/install");
  }
  if (!shop.subscription || shop.subscription.status !== "ACTIVE") {
    return redirect("/app/onboarding");
  }
  return redirect("/app/dashboard");
  ```

#### `app/routes/app.install.tsx` 🆕
- **Purpose**: Shop initialization with loading screen
- **Backend (Loader)**:
  1. Fetch shop info from Shopify GraphQL
  2. Create/update Shop record in database
  3. Initialize default ShopLanguage
  4. Handle reinstall scenario
  5. Return initialization status
- **Frontend (UI)**:
  - Loading screen with animated progress bar
  - 5 initialization steps with checkmarks
  - Auto-redirect to onboarding after 3 seconds
- **GraphQL Queries**:
  ```graphql
  query GetShopInfo {
    shop {
      id, name, email, currencyCode, ianaTimezone
      plan { displayName }
      primaryDomain { host }
    }
  }
  
  query GetShopLocales {
    shopLocales { locale, name, primary, published }
  }
  ```

#### `app/routes/app.onboarding.tsx`
- **Purpose**: Plan selection and subscription creation
- **Changes**:
  - ❌ REMOVED: Shop creation logic
  - ✅ NEW: Redirect to `/app/install` if shop not found
- **3-Step Flow**:
  1. Welcome + Feature highlights
  2. Plan selection (4 plans)
  3. Confirmation + Checkout
- **Backend (Action)**:
  - Create subscription via billingService
  - Free plan → Activate directly
  - Paid plan → Return Shopify confirmation URL

#### `app/routes/app.billing.callback.tsx`
- **Purpose**: Handle Shopify billing confirmation
- **Flow**:
  1. Receive `charge_id` from Shopify
  2. Query charge status
  3. Update subscription to ACTIVE
  4. Create TokenWallet
  5. Redirect to dashboard

#### `app/routes/app.dashboard.tsx`
- **Purpose**: Main app dashboard
- **Access**: Only for shops with active subscriptions

---

## 🔄 Reinstall Scenario

### What Happens When User Uninstalls Then Reinstalls

#### Uninstall (webhook: app/uninstalled)
```typescript
// app/routes/webhooks.app.uninstalled.tsx
await prisma.shop.update({
  where: { shopifyDomain: shop },
  data: {
    isActive: false,
    uninstalledAt: new Date(),
  },
});

await prisma.shopSubscription.update({
  where: { id: subscription.id },
  data: { status: "CANCELLED" },
});
```

#### Reinstall
1. **app._index.tsx** detects `isActive = false` or `uninstalledAt !== null`
2. Redirects to `/app/install`
3. **app.install.tsx** reinitializes shop:
   ```typescript
   await prisma.shop.upsert({
     where: { shopifyDomain: session.shop },
     update: {
       isActive: true,
       uninstalledAt: null,
       // Update shop info from Shopify
     },
   });
   ```
4. Cancels old subscription (if not already cancelled)
5. Redirects to onboarding for new subscription

---

## 🧪 Testing Checklist

### First Time Install
- [ ] Install app from Shopify Admin
- [ ] Verify OAuth redirect works
- [ ] Verify loading screen appears
- [ ] Verify shop created in database with correct info
- [ ] Verify primary language configured
- [ ] Verify redirect to onboarding after 3 seconds
- [ ] Verify 4 plans displayed correctly
- [ ] Test free plan selection → Immediate activation
- [ ] Test paid plan selection → Shopify billing redirect
- [ ] Verify billing callback activates subscription
- [ ] Verify redirect to dashboard

### Reinstall After Uninstall
- [ ] Uninstall app (verify shop marked inactive)
- [ ] Reinstall app
- [ ] Verify redirect to `/app/install` (not onboarding)
- [ ] Verify shop reactivated (isActive = true, uninstalledAt = null)
- [ ] Verify old subscription cancelled
- [ ] Verify redirect to onboarding for new subscription

### Edge Cases
- [ ] Shop exists but no subscription → Redirect to onboarding
- [ ] Shop exists with cancelled subscription → Redirect to onboarding
- [ ] Shop exists with active subscription → Skip to dashboard
- [ ] Database missing default languages → Show error message

---

## 🐛 Troubleshooting

### "Shop not found in database" in onboarding
**Cause**: User bypassed `/app/install` route

**Fix**: Onboarding now redirects to `/app/install` if shop not found

### Loading screen stuck
**Cause**: GraphQL query failed or database error

**Debug**:
```bash
# Check logs
npm run dev

# Check if shop info query works
curl -X POST https://your-store.myshopify.com/admin/api/2026-04/graphql.json \
  -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
  -d '{"query": "{ shop { name email } }"}'
```

### Webhook "Shop not found in database" errors
**Cause**: Webhook arrived before shop initialization

**Prevention**: Shop is now created in `/app/install` immediately after OAuth, before any Shopify data sync webhooks

### Default languages not found
**Cause**: Database not seeded

**Fix**:
```bash
npm run prisma db seed
```

---

## 📝 Environment Requirements

### Database Seed Required
```bash
npm run prisma db seed
```

Creates:
- 15 default languages (en, vi, ja, fr, es, de, it, pt, zh, ko, ar, th, nl, pl, ru)
- 4 billing plans (Free, Basic, Professional, Enterprise)

### Shopify Scopes Required
```toml
# shopify.app.toml
scopes = "write_products,write_translations,read_locales,read_markets"
```

---

## 🚀 Deployment Notes

### Production Checklist
- [ ] Set `DATABASE_URL` to PostgreSQL (not SQLite)
- [ ] Run database migrations: `npm run prisma migrate deploy`
- [ ] Run database seed: `npm run prisma db seed`
- [ ] Configure Redis for Bull queues
- [ ] Set `SHOPIFY_APP_URL` to production URL
- [ ] Test complete install flow in production environment

### Monitoring
Key metrics to monitor:
- Shop creation success rate (app.install loader)
- Subscription activation rate (onboarding → dashboard)
- GraphQL query failure rate
- Average time on loading screen (should be < 3 seconds)

---

## 📚 Related Documentation

- [TESTING.md](./TESTING.md) - API testing and health checks
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Technical architecture
- [LOCAL_DEV.md](./LOCAL_DEV.md) - Local development setup

---

**Last Updated**: 2026-02-24  
**Version**: 2.0 (Refactored Install Flow)
