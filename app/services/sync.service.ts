import { BaseService } from "./base.service";
import { ValidationError } from "~/types/service.types";
import type { SyncRequest, SyncProgress } from "~/types/app.types";
import { syncQueue } from "~/queues/sync.queue";
import type { ShopifyAdminClient } from "~/types/shopify.types";

export class SyncService extends BaseService {
  /**
   * Start sync operation
   */
  async syncResources(request: SyncRequest): Promise<{ syncId: string }> {
    this.log(
      "info",
      `Starting ${request.operation || "FULL_SYNC"} for ${request.resourceType}`,
    );

    // Create sync history record
    const syncHistory = await this.db.syncHistory.create({
      data: {
        shopId: request.shopId,
        resourceType: request.resourceType,
        operation: request.operation || "FULL_SYNC",
        status: "PENDING",
      },
    });

    // Add to queue
    await syncQueue.add({
      shopId: request.shopId,
      resourceType: request.resourceType,
      filters: request.filters,
      operation: request.operation || "FULL_SYNC",
    });

    this.log("info", `Sync job ${syncHistory.id} queued`);

    return { syncId: syncHistory.id };
  }

  /**
   * Get sync progress
   */
  async getSyncProgress(syncId: string): Promise<SyncProgress> {
    const sync = await this.db.syncHistory.findUnique({
      where: { id: syncId },
    });

    if (!sync) {
      throw new ValidationError(`Sync ${syncId} not found`);
    }

    return {
      syncId: sync.id,
      status: sync.status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
      totalItems: sync.totalItems,
      processedItems: sync.processedItems,
      failedItems: sync.failedItems,
      newItems: sync.newItems,
      updatedItems: sync.updatedItems,
    };
  }

  /**
   * Process sync job (called by queue worker)
   */
  async processSyncJob(
    syncId: string,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    const sync = await this.db.syncHistory.findUnique({
      where: { id: syncId },
    });

    if (!sync) {
      throw new ValidationError(`Sync ${syncId} not found`);
    }

    try {
      // Update status to processing
      await this.db.syncHistory.update({
        where: { id: syncId },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });

      // Sync based on resource type
      switch (sync.resourceType) {
        case "PRODUCT":
          await this.syncProducts(sync.shopId, shopifyAdmin);
          break;
        case "COLLECTION":
          await this.syncCollections(sync.shopId, shopifyAdmin);
          break;
        case "BLOG":
          await this.syncBlogs(sync.shopId, shopifyAdmin);
          break;
        case "PAGE":
          await this.syncPages(sync.shopId, shopifyAdmin);
          break;
        default:
          throw new ValidationError(
            `Unsupported resource type: ${sync.resourceType}`,
          );
      }

      // Mark as completed
      await this.db.syncHistory.update({
        where: { id: syncId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      this.log("info", `Sync ${syncId} completed successfully`);
    } catch (error) {
      this.log("error", `Sync ${syncId} failed`, error);

      await this.db.syncHistory.update({
        where: { id: syncId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  }

  /**
   * Sync products from Shopify
   */
  private async syncProducts(
    shopId: string,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    this.log("info", `Syncing products for shop ${shopId}`);

    // Use Shopify Bulk Operations for large datasets
    const query = `#graphql
      {
        products {
          edges {
            node {
              id
              title
              handle
              status
              descriptionHtml
              updatedAt
              seo {
                title
                description
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await shopifyAdmin.graphql(query);
    const result = await response.json();

    const products = result.data?.products?.edges || [];

    // Upsert products to database
    for (const { node: product } of products) {
      await this.db.resource.upsert({
        where: {
          shopId_type_shopifyId: {
            shopId,
            type: "PRODUCT",
            shopifyId: product.id,
          },
        },
        create: {
          shopId,
          type: "PRODUCT",
          shopifyId: product.id,
          handle: product.handle,
          title: product.title,
          status: product.status,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          shopifyUpdatedAt: new Date(product.updatedAt),
          fields: {
            create: [
              {
                fieldName: "title",
                originalValue: product.title,
              },
              {
                fieldName: "description",
                originalValue: product.descriptionHtml || "",
              },
              {
                fieldName: "seo_title",
                originalValue: product.seo?.title || "",
              },
              {
                fieldName: "seo_description",
                originalValue: product.seo?.description || "",
              },
            ],
          },
        },
        update: {
          handle: product.handle,
          title: product.title,
          status: product.status,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          shopifyUpdatedAt: new Date(product.updatedAt),
        },
      });
    }

    this.log("info", `Synced ${products.length} products`);
  }

  /**
   * Sync collections from Shopify
   */
  private async syncCollections(
    shopId: string,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    this.log("info", `Syncing collections for shop ${shopId}`);

    const query = `#graphql
      {
        collections(first: 250) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              updatedAt
              seo {
                title
                description
              }
            }
          }
        }
      }
    `;

    const response = await shopifyAdmin.graphql(query);
    const result = await response.json();

    const collections = result.data?.collections?.edges || [];

    for (const { node: collection } of collections) {
      await this.db.resource.upsert({
        where: {
          shopId_type_shopifyId: {
            shopId,
            type: "COLLECTION",
            shopifyId: collection.id,
          },
        },
        create: {
          shopId,
          type: "COLLECTION",
          shopifyId: collection.id,
          handle: collection.handle,
          title: collection.title,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          shopifyUpdatedAt: new Date(collection.updatedAt),
          fields: {
            create: [
              {
                fieldName: "title",
                originalValue: collection.title,
              },
              {
                fieldName: "description",
                originalValue: collection.descriptionHtml || "",
              },
            ],
          },
        },
        update: {
          handle: collection.handle,
          title: collection.title,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          shopifyUpdatedAt: new Date(collection.updatedAt),
        },
      });
    }

    this.log("info", `Synced ${collections.length} collections`);
  }

  /**
   * Sync blogs from Shopify
   */
  private async syncBlogs(
    _shopId: string,
    _shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    this.log("info", `Syncing blogs for shop ${_shopId}`);

    // TODO: Implement blog sync using Shopify GraphQL
    this.log("warn", "Blog sync not yet implemented");
  }

  /**
   * Sync pages from Shopify
   */
  private async syncPages(
    _shopId: string,
    _shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    this.log("info", `Syncing pages for shop ${_shopId}`);

    // TODO: Implement page sync using Shopify GraphQL
    this.log("warn", "Page sync not yet implemented");
  }
}

export default new SyncService();
