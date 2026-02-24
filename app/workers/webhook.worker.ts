import { Job } from "bull";
import webhookQueue, { type WebhookJobData } from "~/queues/webhook.queue";
import prisma from "~/db.server";

/**
 * Webhook Queue Worker
 * Processes Shopify webhook events
 */
webhookQueue.process(async (job: Job<WebhookJobData>) => {
  const { webhookEventId, shopId, topic, payload } = job.data;

  console.log(
    `📨 Processing webhook job ${job.id}: ${topic} for shop ${shopId}`,
  );

  try {
    // Mark webhook as processing
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: false,
      },
    });

    // Handle different webhook topics
    switch (topic) {
      case "products/create":
      case "products/update":
        await handleProductWebhook(shopId, payload);
        break;

      case "collections/create":
      case "collections/update":
        await handleCollectionWebhook(shopId, payload);
        break;

      case "app/uninstalled":
        await handleAppUninstalled(shopId);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    console.log(`✅ Webhook job ${job.id} completed successfully`);

    return {
      success: true,
      webhookEventId,
      topic,
    };
  } catch (error) {
    console.error(`❌ Webhook job ${job.id} failed:`, error);

    // Update retry count
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        retryCount: {
          increment: 1,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
});

/**
 * Handle product create/update webhooks
 */
async function handleProductWebhook(
  shopId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const productId = `gid://shopify/Product/${payload.id}`;

  console.log(`📦 Handling product webhook for ${productId}`);

  // Check if auto-translate is enabled for any language
  const shopLanguages = await prisma.shopLanguage.findMany({
    where: {
      shopId,
      autoTranslate: true,
    },
    include: {
      language: true,
    },
  });

  if (shopLanguages.length === 0) {
    console.log("No auto-translate languages configured, skipping");
    return;
  }

  // Find or create resource
  const resource = await prisma.resource.upsert({
    where: {
      shopId_type_shopifyId: {
        shopId,
        type: "PRODUCT",
        shopifyId: productId,
      },
    },
    create: {
      shopId,
      type: "PRODUCT",
      shopifyId: productId,
      handle: payload.handle as string,
      title: payload.title as string,
      status: payload.status as string,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      shopifyUpdatedAt: new Date(payload.updated_at as string),
    },
    update: {
      handle: payload.handle as string,
      title: payload.title as string,
      status: payload.status as string,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      shopifyUpdatedAt: new Date(payload.updated_at as string),
    },
  });

  // Create translation job
  const targetLanguageCodes = shopLanguages.map((sl) => sl.language.code);
  const defaultEngine = shopLanguages[0]?.defaultEngine || "GOOGLE";

  const translationJob = await prisma.translationJob.create({
    data: {
      resourceId: resource.id,
      targetLanguageCodes: targetLanguageCodes,
      engine: defaultEngine,
      status: "PENDING",
    },
  });

  // Add to translation queue
  const { default: translationQueue } =
    await import("~/queues/translation.queue");
  await translationQueue.add({
    jobId: translationJob.id,
    shopId,
    resourceId: resource.id,
    targetLanguageCodes,
    engine: defaultEngine,
  });

  console.log(
    `📝 Created translation job ${translationJob.id} for product ${productId}`,
  );
}

/**
 * Handle collection create/update webhooks
 */
async function handleCollectionWebhook(
  shopId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const collectionId = `gid://shopify/Collection/${payload.id}`;

  console.log(`📚 Handling collection webhook for ${collectionId}`);

  // Similar logic to product webhook
  const shopLanguages = await prisma.shopLanguage.findMany({
    where: {
      shopId,
      autoTranslate: true,
    },
    include: {
      language: true,
    },
  });

  if (shopLanguages.length === 0) {
    return;
  }

  const resource = await prisma.resource.upsert({
    where: {
      shopId_type_shopifyId: {
        shopId,
        type: "COLLECTION",
        shopifyId: collectionId,
      },
    },
    create: {
      shopId,
      type: "COLLECTION",
      shopifyId: collectionId,
      handle: payload.handle as string,
      title: payload.title as string,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      shopifyUpdatedAt: new Date(payload.updated_at as string),
    },
    update: {
      handle: payload.handle as string,
      title: payload.title as string,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      shopifyUpdatedAt: new Date(payload.updated_at as string),
    },
  });

  const targetLanguageCodes = shopLanguages.map((sl) => sl.language.code);
  const defaultEngine = shopLanguages[0]?.defaultEngine || "GOOGLE";

  const translationJob = await prisma.translationJob.create({
    data: {
      resourceId: resource.id,
      targetLanguageCodes: targetLanguageCodes,
      engine: defaultEngine,
      status: "PENDING",
    },
  });

  const { default: translationQueue } =
    await import("~/queues/translation.queue");
  await translationQueue.add({
    jobId: translationJob.id,
    shopId,
    resourceId: resource.id,
    targetLanguageCodes,
    engine: defaultEngine,
  });
}

/**
 * Handle app uninstalled webhook
 */
async function handleAppUninstalled(shopId: string): Promise<void> {
  console.log(`🔴 App uninstalled for shop ${shopId}`);

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      isActive: false,
      uninstalledAt: new Date(),
    },
  });
}

console.log("🚀 Webhook queue worker started");

export default webhookQueue;
