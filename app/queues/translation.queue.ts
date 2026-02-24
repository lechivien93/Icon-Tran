import Queue from "bull";
import { getRedisClient } from "~/lib/redis.server";
import type { TranslationEngine } from "@prisma/client";

export interface TranslationJobData {
  jobId: string; // TranslationJob.id from database
  shopId: string;
  resourceId: string;
  targetLanguageCodes: string[];
  engine: TranslationEngine;
}

export const translationQueue = new Queue<TranslationJobData>("translation", {
  createClient: () => getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: false,
  },
  limiter: {
    max: 100, // Max 100 jobs per duration
    duration: 60000, // 1 minute
  },
});

// Queue Event Handlers
translationQueue.on("error", (error) => {
  console.error("❌ Translation Queue Error:", error);
});

translationQueue.on("failed", (job, error) => {
  console.error(`❌ Translation Job ${job.id} failed:`, error.message);
});

translationQueue.on("completed", (job) => {
  console.log(`✅ Translation Job ${job.id} completed successfully`);
});

translationQueue.on("progress", (job, progress) => {
  console.log(`⏳ Translation Job ${job.id} progress: ${progress}%`);
});

export default translationQueue;
