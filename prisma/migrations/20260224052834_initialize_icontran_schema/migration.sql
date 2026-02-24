-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT,
    "plan" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "isRTL" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopLanguage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "autoTranslate" BOOLEAN NOT NULL DEFAULT false,
    "defaultEngine" TEXT NOT NULL DEFAULT 'GOOGLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopLanguage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopifyMarketId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "countries" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Market_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "maxLanguages" INTEGER NOT NULL DEFAULT 1,
    "maxProducts" INTEGER NOT NULL DEFAULT 100,
    "googleTranslations" INTEGER NOT NULL DEFAULT 10000,
    "includesImageTrans" BOOLEAN NOT NULL DEFAULT false,
    "includesGlossary" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL,
    "shopifyPlanName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShopSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shopifyChargeId" TEXT,
    "confirmationUrl" TEXT,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelAt" DATETIME,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenWallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TokenWallet_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "shopifyChargeId" TEXT,
    "amountUsd" REAL,
    "engine" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "TokenWallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "handle" TEXT,
    "title" TEXT,
    "status" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'OUTDATED',
    "lastSyncedAt" DATETIME,
    "shopifyUpdatedAt" DATETIME,
    "translationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "translatedCount" INTEGER NOT NULL DEFAULT 0,
    "totalLanguages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldPath" TEXT,
    "originalValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResourceField_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "translatedValue" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "isManualEdit" BOOLEAN NOT NULL DEFAULT false,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Translation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Translation_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ResourceField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Translation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "targetLanguageCodes" JSONB NOT NULL,
    "engine" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "totalFields" INTEGER NOT NULL DEFAULT 0,
    "processedFields" INTEGER NOT NULL DEFAULT 0,
    "failedFields" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "queueJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TranslationJob_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Glossary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "translation" TEXT,
    "languageCode" TEXT,
    "rule" TEXT NOT NULL DEFAULT 'DO_NOT_TRANSLATE',
    "caseSensitive" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Glossary_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "operation" TEXT NOT NULL DEFAULT 'FULL_SYNC',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "newItems" INTEGER NOT NULL DEFAULT 0,
    "updatedItems" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "duration" INTEGER,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopifyEventId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatConversation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "intentConfidence" REAL,
    "extractedParams" JSONB,
    "actionExecuted" TEXT,
    "actionResult" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopifyDomain_key" ON "Shop"("shopifyDomain");

-- CreateIndex
CREATE INDEX "Shop_shopifyDomain_idx" ON "Shop"("shopifyDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE INDEX "Language_code_idx" ON "Language"("code");

-- CreateIndex
CREATE INDEX "ShopLanguage_shopId_idx" ON "ShopLanguage"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopLanguage_shopId_languageId_key" ON "ShopLanguage"("shopId", "languageId");

-- CreateIndex
CREATE INDEX "Market_shopId_idx" ON "Market"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Market_shopId_shopifyMarketId_key" ON "Market"("shopId", "shopifyMarketId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_name_key" ON "BillingPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSubscription_shopId_key" ON "ShopSubscription"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSubscription_shopifyChargeId_key" ON "ShopSubscription"("shopifyChargeId");

-- CreateIndex
CREATE INDEX "ShopSubscription_shopId_idx" ON "ShopSubscription"("shopId");

-- CreateIndex
CREATE INDEX "ShopSubscription_status_idx" ON "ShopSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TokenWallet_shopId_key" ON "TokenWallet"("shopId");

-- CreateIndex
CREATE INDEX "TokenWallet_shopId_idx" ON "TokenWallet"("shopId");

-- CreateIndex
CREATE INDEX "TokenTransaction_walletId_idx" ON "TokenTransaction"("walletId");

-- CreateIndex
CREATE INDEX "TokenTransaction_createdAt_idx" ON "TokenTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Resource_shopId_type_idx" ON "Resource"("shopId", "type");

-- CreateIndex
CREATE INDEX "Resource_syncStatus_idx" ON "Resource"("syncStatus");

-- CreateIndex
CREATE INDEX "Resource_translationStatus_idx" ON "Resource"("translationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_shopId_type_shopifyId_key" ON "Resource"("shopId", "type", "shopifyId");

-- CreateIndex
CREATE INDEX "ResourceField_resourceId_idx" ON "ResourceField"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceField_resourceId_fieldName_fieldPath_key" ON "ResourceField"("resourceId", "fieldName", "fieldPath");

-- CreateIndex
CREATE INDEX "Translation_resourceId_idx" ON "Translation"("resourceId");

-- CreateIndex
CREATE INDEX "Translation_languageId_idx" ON "Translation"("languageId");

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_resourceId_fieldId_languageId_key" ON "Translation"("resourceId", "fieldId", "languageId");

-- CreateIndex
CREATE INDEX "TranslationJob_resourceId_idx" ON "TranslationJob"("resourceId");

-- CreateIndex
CREATE INDEX "TranslationJob_status_idx" ON "TranslationJob"("status");

-- CreateIndex
CREATE INDEX "TranslationJob_createdAt_idx" ON "TranslationJob"("createdAt");

-- CreateIndex
CREATE INDEX "Glossary_shopId_idx" ON "Glossary"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Glossary_shopId_term_languageCode_key" ON "Glossary"("shopId", "term", "languageCode");

-- CreateIndex
CREATE INDEX "SyncHistory_shopId_idx" ON "SyncHistory"("shopId");

-- CreateIndex
CREATE INDEX "SyncHistory_status_idx" ON "SyncHistory"("status");

-- CreateIndex
CREATE INDEX "SyncHistory_createdAt_idx" ON "SyncHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_shopifyEventId_key" ON "WebhookEvent"("shopifyEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_shopId_idx" ON "WebhookEvent"("shopId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "WebhookEvent_topic_idx" ON "WebhookEvent"("topic");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ChatConversation_shopId_idx" ON "ChatConversation"("shopId");

-- CreateIndex
CREATE INDEX "ChatConversation_createdAt_idx" ON "ChatConversation"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
