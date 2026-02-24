import Queue from "bull";
import { getRedisClient } from "~/lib/redis.server";

export interface WebhookJobData {
  webhookEventId: string; // WebhookEvent.id from database
  shopId: string;
  topic: string;
  payload: Record<string, unknown>;
}

export const webhookQueue = new Queue<WebhookJobData>("webhook", {
  createClient: () => getRedisClient(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: false,
  },
});

// Queue Event Handlers
webhookQueue.on("error", (error) => {
  console.error("❌ Webhook Queue Error:", error);
});

webhookQueue.on("failed", (job, error) => {
  console.error(`❌ Webhook Job ${job.id} failed:`, error.message);
});

webhookQueue.on("completed", (job) => {
  console.log(`✅ Webhook Job ${job.id} completed successfully`);
});

export default webhookQueue;
