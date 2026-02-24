import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import billingService from "~/services/billing.service";
import prisma from "~/db.server";

/**
 * POST /api/billing/tokens - Purchase tokens
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
  const { packageAmount, priceUsd } = body as {
    packageAmount: number;
    priceUsd: number;
  };

  if (!packageAmount || !priceUsd) {
    return Response.json(
      { error: "Package amount and price are required" },
      { status: 400 },
    );
  }

  try {
    const result = await billingService.purchaseTokens(
      {
        shopId: shop.id,
        packageAmount,
        priceUsd,
      },
      admin,
    );

    return Response.json(result);
  } catch (error) {
    console.error("Purchase tokens error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
