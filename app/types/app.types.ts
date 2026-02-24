import type { TranslationEngine, ResourceType } from "@prisma/client";

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  engine: TranslationEngine;
  glossaryRules?: GlossaryRuleData[];
}

export interface TranslateResponse {
  translatedText: string;
  engine: TranslationEngine;
  tokensUsed: number;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface GlossaryRuleData {
  term: string;
  translation?: string;
  rule: "DO_NOT_TRANSLATE" | "CUSTOM_TRANSLATION";
  caseSensitive: boolean;
}

export interface TranslateResourceRequest {
  resourceId: string;
  targetLanguageCodes: string[];
  engine: TranslationEngine;
  autoPublish?: boolean;
}

export interface TranslationJobProgress {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalFields: number;
  processedFields: number;
  failedFields: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyncRequest {
  shopId: string;
  resourceType: ResourceType;
  operation?: "FULL_SYNC" | "INCREMENTAL_SYNC" | "SINGLE_ITEM";
  filters?: {
    ids?: string[];
    updatedAfter?: Date;
    handle?: string;
  };
}

export interface SyncProgress {
  syncId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  newItems: number;
  updatedItems: number;
}

export interface ChatPromptRequest {
  conversationId?: string;
  message: string;
  shopId: string;
}

export interface ChatPromptResponse {
  conversationId: string;
  messageId: string;
  response: string;
  intent?: {
    action: string;
    confidence: number;
    params: Record<string, unknown>;
  };
  actionExecuted?: {
    name: string;
    result: unknown;
  };
}

export interface BillingPlanData {
  id: string;
  name: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  maxLanguages: number;
  maxProducts: number;
  googleTranslations: number;
  features: string[];
}

export interface SubscriptionData {
  id: string;
  shopId: string;
  plan: BillingPlanData;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface TokenPurchaseRequest {
  shopId: string;
  packageAmount: number; // Number of tokens
  priceUsd: number;
}
