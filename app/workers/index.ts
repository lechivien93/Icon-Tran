#!/usr/bin/env node

/**
 * Worker Startup Script
 * Starts all Bull queue workers for background job processing
 *
 * Usage:
 * npm run worker
 * or
 * node --loader tsx app/workers/index.ts
 */

import { syncWorker } from "./sync.worker";
import { translationWorker } from "./translation.worker";
import { webhookWorker } from "./webhook.worker";
import { redisClient as redis } from "../lib/redis.server";

const workers = [
  { name: "Sync Worker", instance: syncWorker },
  { name: "Translation Worker", instance: translationWorker },
  { name: "Webhook Worker", instance: webhookWorker },
];

async function startWorkers() {
  console.log("🚀 Starting IconTran Workers...\n");

  // Test Redis connection first
  try {
    await redis.ping();
    console.log("✅ Redis connection successful\n");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    process.exit(1);
  }

  // Start all workers
  workers.forEach((worker) => {
    console.log(`📦 ${worker.name} started`);

    // Listen to worker events
    worker.instance.on("completed", (job) => {
      console.log(`✅ [${worker.name}] Job ${job.id} completed successfully`);
    });

    worker.instance.on("failed", (job, err) => {
      console.error(`❌ [${worker.name}] Job ${job?.id} failed:`, err.message);
    });

    worker.instance.on("error", (error) => {
      console.error(`❌ [${worker.name}] Worker error:`, error);
    });

    worker.instance.on("stalled", (jobId) => {
      console.warn(`⚠️ [${worker.name}] Job ${jobId} stalled`);
    });
  });

  console.log("\n✨ All workers are running and waiting for jobs...");
  console.log("Press Ctrl+C to stop workers\n");
}

// Graceful shutdown
async function shutdown() {
  console.log("\n⏳ Shutting down workers gracefully...");

  const closePromises = workers.map(async (worker) => {
    console.log(`🛑 Closing ${worker.name}...`);
    await worker.instance.close();
    console.log(`✅ ${worker.name} closed`);
  });

  await Promise.all(closePromises);

  // Close Redis connection
  await redis.quit();
  console.log("✅ Redis connection closed");

  console.log("👋 Workers shutdown complete");
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  shutdown();
});

// Start workers
startWorkers().catch((error) => {
  console.error("❌ Failed to start workers:", error);
  process.exit(1);
});
