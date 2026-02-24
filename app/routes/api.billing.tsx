import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import billingService from "~/services/billing.service";
import prisma from "~/db.server";

/**
 * GET /api/billing - Get billing plans and current subscription
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  try {
    const plans = await billingService.getPlans();
    const subscription = await billingService.getSubscription(shop.id);
    const tokenBalance = await billingService.getTokenBalance(shop.id);

    return Response.json({
      plans,
      subscription,
      tokenBalance,
    });
  } catch (error) {
    console.error("Billing error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

/**
 * POST /api/billing/subscribe - Create subscription
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const body = await request.json();
  const { planId } = body as { planId: string };

  if (!planId) {
    return Response.json({ error: "Plan ID is required" }, { status: 400 });
  }

  try {
    const result = await billingService.createSubscription(
      shop.id,
      planId,
      admin,
    );
    return Response.json(result);
  } catch (error) {
    console.error("Create subscription error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
