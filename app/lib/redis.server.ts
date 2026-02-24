import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0", 10),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    redis.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
    });
  }

  return redis;
}

export async function closeRedisClient(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Export singleton instance directly
export const redisClient = getRedisClient();

export default getRedisClient;
