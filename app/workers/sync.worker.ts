import { Job } from "bull";
import syncQueue, { type SyncJobData } from "~/queues/sync.queue";
import syncService from "~/services/sync.service";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * Sync Queue Worker
 * Processes bulk sync operations from Shopify
 */
syncQueue.process(async (job: Job<SyncJobData>) => {
  const { shopId, resourceType, operation: _operation } = job.data;

  console.log(
    `🔄 Processing sync job ${job.id}: ${resourceType} for shop ${shopId}`,
  );

  try {
    // Get shop details
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new Error(`Shop ${shopId} not found`);
    }

    // Get admin session for this shop
    const session = await prisma.session.findFirst({
      where: {
        shop: shop.shopifyDomain,
        isOnline: false,
      },
      orderBy: {
        expires: "desc",
      },
    });

    if (!session) {
      throw new Error(
        `No offline session found for shop ${shop.shopifyDomain}`,
      );
    }

    // Create Shopify admin client
    const { admin } = await authenticate.admin(
      new Request(`https://${shop.shopifyDomain}/admin`),
    );

    // Find the sync history record
    const syncHistory = await prisma.syncHistory.findFirst({
      where: {
        shopId,
        resourceType,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!syncHistory) {
      throw new Error("Sync history record not found");
    }

    // Process the sync
    await syncService.processSyncJob(syncHistory.id, admin);

    // Update job progress
    await job.progress(100);

    console.log(`✅ Sync job ${job.id} completed successfully`);

    return {
      success: true,
      syncId: syncHistory.id,
      resourceType,
    };
  } catch (error) {
    console.error(`❌ Sync job ${job.id} failed:`, error);
    throw error;
  }
});

console.log("🚀 Sync queue worker started");

export default syncQueue;
