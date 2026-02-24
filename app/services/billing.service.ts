import { BaseService } from "./base.service";
import { ValidationError, NotFoundError } from "~/types/service.types";
import type {
  BillingPlanData,
  SubscriptionData,
  TokenPurchaseRequest,
} from "~/types/app.types";
import type { ShopifyAdminClient } from "~/types/shopify.types";

export class BillingService extends BaseService {
  /**
   * Get all billing plans
   */
  async getPlans(): Promise<BillingPlanData[]> {
    const plans = await this.db.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval as "MONTHLY" | "YEARLY",
      maxLanguages: plan.maxLanguages,
      maxProducts: plan.maxProducts,
      googleTranslations: plan.googleTranslations,
      features: plan.features as string[],
    }));
  }

  /**
   * Get shop's current subscription
   */
  async getSubscription(shopId: string): Promise<SubscriptionData | null> {
    const subscription = await this.db.shopSubscription.findUnique({
      where: { shopId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      shopId: subscription.shopId,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price,
        interval: subscription.plan.interval as "MONTHLY" | "YEARLY",
        maxLanguages: subscription.plan.maxLanguages,
        maxProducts: subscription.plan.maxProducts,
        googleTranslations: subscription.plan.googleTranslations,
        features: subscription.plan.features as string[],
      },
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart || undefined,
      currentPeriodEnd: subscription.currentPeriodEnd || undefined,
    };
  }

  /**
   * Create subscription (returns Shopify confirmation URL)
   * This should be called when merchant selects a plan
   */
  async createSubscription(
    shopId: string,
    planId: string,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<{ confirmationUrl: string; subscriptionId: string }> {
    const plan = await this.db.billingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundError("Billing Plan", planId);
    }

    // Create subscription in Shopify
    const response = await shopifyAdmin.graphql(
      `#graphql
      mutation CreateSubscription($name: String!, $price: Decimal!, $returnUrl: String!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: $price, currencyCode: USD }
                interval: ${plan.interval}
              }
            }
          }]
        ) {
          appSubscription {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          name: plan.shopifyPlanName || plan.name,
          price: plan.price.toString(),
          returnUrl: `${process.env.SHOPIFY_APP_URL}/api/billing/callback`,
        },
      },
    );

    const result = await response.json();
    const subscriptionData = result.data?.appSubscriptionCreate;

    if (subscriptionData?.userErrors?.length > 0) {
      throw new ValidationError(
        "Failed to create subscription",
        subscriptionData.userErrors,
      );
    }

    // Save subscription to database
    const subscription = await this.db.shopSubscription.create({
      data: {
        shopId,
        planId,
        status: "PENDING",
        shopifyChargeId: subscriptionData.appSubscription.id,
        confirmationUrl: subscriptionData.confirmationUrl,
      },
    });

    this.log(
      "info",
      `Created subscription ${subscription.id} for shop ${shopId}`,
    );

    return {
      confirmationUrl: subscriptionData.confirmationUrl,
      subscriptionId: subscription.id,
    };
  }

  /**
   * Confirm subscription (called after merchant approves)
   */
  async confirmSubscription(subscriptionId: string): Promise<void> {
    await this.db.shopSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), "MONTHLY"),
      },
    });

    this.log("info", `Confirmed subscription ${subscriptionId}`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    shopId: string,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<void> {
    const subscription = await this.db.shopSubscription.findUnique({
      where: { shopId },
    });

    if (!subscription || !subscription.shopifyChargeId) {
      throw new NotFoundError("Subscription", shopId);
    }

    // Cancel in Shopify
    await shopifyAdmin.graphql(
      `#graphql
      mutation CancelSubscription($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: subscription.shopifyChargeId,
        },
      },
    );

    // Update in database
    await this.db.shopSubscription.update({
      where: { shopId },
      data: {
        status: "CANCELLED",
        canceledAt: new Date(),
      },
    });

    this.log("info", `Cancelled subscription for shop ${shopId}`);
  }

  /**
   * Purchase tokens (one-time charge)
   */
  async purchaseTokens(
    request: TokenPurchaseRequest,
    shopifyAdmin: ShopifyAdminClient,
  ): Promise<{ confirmationUrl: string }> {
    const { shopId, packageAmount, priceUsd } = request;

    // Create one-time charge in Shopify
    const response = await shopifyAdmin.graphql(
      `#graphql
      mutation CreateOneTimeCharge($name: String!, $price: Decimal!, $returnUrl: String!) {
        appPurchaseOneTimeCreate(
          name: $name
          price: { amount: $price, currencyCode: USD }
          returnUrl: $returnUrl
        ) {
          appPurchaseOneTime {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          name: `${packageAmount} Tokens`,
          price: priceUsd.toString(),
          returnUrl: `${process.env.SHOPIFY_APP_URL}/api/billing/tokens/callback`,
        },
      },
    );

    const result = await response.json();
    const purchaseData = result.data?.appPurchaseOneTimeCreate;

    if (purchaseData?.userErrors?.length > 0) {
      throw new ValidationError(
        "Failed to create token purchase",
        purchaseData.userErrors,
      );
    }

    this.log(
      "info",
      `Created token purchase for shop ${shopId}: ${packageAmount} tokens for $${priceUsd}`,
    );

    return {
      confirmationUrl: purchaseData.confirmationUrl,
    };
  }

  /**
   * Add tokens to wallet after successful purchase
   */
  async addTokensToWallet(
    shopId: string,
    amount: number,
    shopifyChargeId: string,
    amountUsd: number,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      // Get or create wallet
      let wallet = await tx.tokenWallet.findUnique({
        where: { shopId },
      });

      if (!wallet) {
        wallet = await tx.tokenWallet.create({
          data: {
            shopId,
            balance: 0,
            totalPurchased: 0,
            totalUsed: 0,
          },
        });
      }

      // Update wallet
      await tx.tokenWallet.update({
        where: { shopId },
        data: {
          balance: { increment: amount },
          totalPurchased: { increment: amount },
        },
      });

      // Record transaction
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          type: "PURCHASE",
          amount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance + amount,
          shopifyChargeId,
          amountUsd,
          description: `Purchased ${amount} tokens for $${amountUsd}`,
        },
      });
    });

    this.log("info", `Added ${amount} tokens to shop ${shopId} wallet`);
  }

  /**
   * Get token wallet balance
   */
  async getTokenBalance(shopId: string): Promise<number> {
    const wallet = await this.db.tokenWallet.findUnique({
      where: { shopId },
    });

    return wallet?.balance || 0;
  }

  /**
   * Helper: Calculate period end date
   */
  private calculatePeriodEnd(start: Date, interval: string): Date {
    const end = new Date(start);
    if (interval === "MONTHLY") {
      end.setMonth(end.getMonth() + 1);
    } else if (interval === "YEARLY") {
      end.setFullYear(end.getFullYear() + 1);
    }
    return end;
  }
}

export default new BillingService();
