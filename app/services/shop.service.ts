import { BaseService } from "./base.service";
import { NotFoundError } from "~/types/service.types";
import type { Shop, ShopLanguage } from "@prisma/client";

export class ShopService extends BaseService {
  /**
   * Get shop by Shopify domain
   */
  async getShopByDomain(shopifyDomain: string): Promise<Shop | null> {
    return await this.db.shop.findUnique({
      where: { shopifyDomain },
      include: {
        languages: {
          include: {
            language: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
        tokenWallet: true,
      },
    });
  }

  /**
   * Get shop by ID
   */
  async getShopById(shopId: string): Promise<Shop> {
    const shop = await this.db.shop.findUnique({
      where: { id: shopId },
      include: {
        languages: {
          include: {
            language: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
        tokenWallet: true,
      },
    });

    if (!shop) {
      throw new NotFoundError("Shop", shopId);
    }

    return shop;
  }

  /**
   * Create or update shop
   */
  async upsertShop(data: {
    shopifyDomain: string;
    name: string;
    email?: string;
    currency?: string;
    timezone?: string;
    country?: string;
  }): Promise<Shop> {
    this.log("info", `Upserting shop: ${data.shopifyDomain}`);

    return await this.db.shop.upsert({
      where: { shopifyDomain: data.shopifyDomain },
      create: {
        ...data,
        installedAt: new Date(),
      },
      update: {
        name: data.name,
        email: data.email,
        currency: data.currency,
        timezone: data.timezone,
        country: data.country,
        isActive: true,
        uninstalledAt: null,
      },
    });
  }

  /**
   * Mark shop as uninstalled
   */
  async uninstallShop(shopifyDomain: string): Promise<Shop> {
    this.log("warn", `Uninstalling shop: ${shopifyDomain}`);

    return await this.db.shop.update({
      where: { shopifyDomain },
      data: {
        isActive: false,
        uninstalledAt: new Date(),
      },
    });
  }

  /**
   * Get shop languages
   */
  async getShopLanguages(shopId: string): Promise<ShopLanguage[]> {
    return await this.db.shopLanguage.findMany({
      where: { shopId },
      include: {
        language: true,
      },
      orderBy: {
        isDefault: "desc",
      },
    });
  }

  /**
   * Add language to shop
   */
  async addLanguage(
    shopId: string,
    languageCode: string,
    options?: {
      isDefault?: boolean;
      autoTranslate?: boolean;
      defaultEngine?: "GOOGLE" | "OPENAI" | "GEMINI";
    },
  ): Promise<ShopLanguage> {
    // Get or create language
    const language = await this.db.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      throw new NotFoundError("Language", languageCode);
    }

    // If this is the default language, unset others
    if (options?.isDefault) {
      await this.db.shopLanguage.updateMany({
        where: { shopId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await this.db.shopLanguage.upsert({
      where: {
        shopId_languageId: {
          shopId,
          languageId: language.id,
        },
      },
      create: {
        shopId,
        languageId: language.id,
        isDefault: options?.isDefault ?? false,
        autoTranslate: options?.autoTranslate ?? false,
        defaultEngine: options?.defaultEngine ?? "GOOGLE",
      },
      update: {
        isDefault: options?.isDefault ?? false,
        autoTranslate: options?.autoTranslate,
        defaultEngine: options?.defaultEngine,
      },
      include: {
        language: true,
      },
    });
  }

  /**
   * Remove language from shop
   */
  async removeLanguage(shopId: string, languageCode: string): Promise<void> {
    const language = await this.db.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      throw new NotFoundError("Language", languageCode);
    }

    await this.db.shopLanguage.delete({
      where: {
        shopId_languageId: {
          shopId,
          languageId: language.id,
        },
      },
    });

    this.log("info", `Removed language ${languageCode} from shop ${shopId}`);
  }

  /**
   * Check if shop has active subscription
   */
  async hasActiveSubscription(shopId: string): Promise<boolean> {
    const subscription = await this.db.shopSubscription.findUnique({
      where: { shopId },
    });

    return subscription?.status === "ACTIVE";
  }
}

export default new ShopService();
