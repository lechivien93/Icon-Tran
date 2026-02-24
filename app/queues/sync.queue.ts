import Queue from "bull";
import { getRedisClient } from "~/lib/redis.server";
import type { ResourceType } from "@prisma/client";

export interface SyncJobData {
  shopId: string;
  resourceType: ResourceType;
  filters?: {
    ids?: string[];
    updatedAfter?: Date;
    handle?: string;
  };
  operation: "FULL_SYNC" | "INCREMENTAL_SYNC" | "SINGLE_ITEM";
}

export const syncQueue = new Queue<SyncJobData>("sync", {
  createClient: () => getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

// Queue Event Handlers
syncQueue.on("error", (error) => {
  console.error("❌ Sync Queue Error:", error);
});

syncQueue.on("failed", (job, error) => {
  console.error(`❌ Sync Job ${job.id} failed:`, error.message);
});

syncQueue.on("completed", (job) => {
  console.log(`✅ Sync Job ${job.id} completed successfully`);
});

export default syncQueue;
