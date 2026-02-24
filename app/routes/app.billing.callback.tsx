import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * Billing callback route
 * Shopify redirects here after merchant approves/declines subscription
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    console.error("No charge_id in callback");
    return redirect("/app/onboarding?error=no_charge_id");
  }

  try {
    // Query the subscription status from Shopify
    const response = await admin.graphql(
      `#graphql
      query getSubscription($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id
            name
            status
            test
            currentPeriodEnd
            trialDays
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/AppSubscription/${chargeId}`,
        },
      },
    );

    const data = await response.json();
    const subscription = data.data?.node;

    if (!subscription) {
      console.error("Subscription not found:", chargeId);
      return redirect("/app/onboarding?error=subscription_not_found");
    }

    // Update subscription status in database
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop },
      include: { subscription: true },
    });

    if (!shop) {
      console.error("Shop not found:", session.shop);
      return redirect("/app/onboarding?error=shop_not_found");
    }

    // If subscription is active, update in database
    if (subscription.status === "ACTIVE") {
      await prisma.shopSubscription.update({
        where: { id: shop.subscription!.id },
        data: {
          status: "ACTIVE",
          shopifySubscriptionId: chargeId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : undefined,
        },
      });

      // Create token wallet if not exists
      if (!shop.tokenWallet) {
        await prisma.tokenWallet.create({
          data: {
            shopId: shop.id,
            balance: 0,
          },
        });
      }

      console.log(`✅ Subscription activated for ${session.shop}: ${chargeId}`);

      // Redirect to dashboard with success message
      return redirect("/app/dashboard?subscription=success");
    } else if (subscription.status === "DECLINED") {
      console.log(`❌ Subscription declined for ${session.shop}: ${chargeId}`);

      // Delete the pending subscription
      if (shop.subscription) {
        await prisma.shopSubscription.delete({
          where: { id: shop.subscription.id },
        });
      }

      return redirect("/app/onboarding?error=subscription_declined");
    }

    // Pending or other status - wait for approval
    return redirect("/app/onboarding?status=pending");
  } catch (error) {
    console.error("Billing callback error:", error);
    return redirect(
      `/app/onboarding?error=${encodeURIComponent(error instanceof Error ? error.message : "unknown_error")}`,
    );
  }
};
