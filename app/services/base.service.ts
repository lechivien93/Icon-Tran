import prisma from "~/db.server";
import type { PrismaClient } from "@prisma/client";

export abstract class BaseService {
  protected db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Safe database transaction wrapper
   */
  protected async transaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return await this.db.$transaction(fn);
  }

  /**
   * Log service actions
   */
  protected log(
    level: "info" | "warn" | "error",
    message: string,
    meta?: unknown,
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.constructor.name}] ${message}`;

    switch (level) {
      case "info":
        console.log(logMessage, meta || "");
        break;
      case "warn":
        console.warn(logMessage, meta || "");
        break;
      case "error":
        console.error(logMessage, meta || "");
        break;
    }
  }
}
