import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import syncService from "~/services/sync.service";
import prisma from "~/db.server";
import type { ResourceType } from "@prisma/client";

/**
 * GET /api/sync - Get sync history
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const syncHistory = await prisma.syncHistory.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return Response.json({ syncHistory });
};

/**
 * POST /api/sync - Start sync operation
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const body = await request.json();
  const { resourceType, operation = "FULL_SYNC" } = body as {
    resourceType: ResourceType;
    operation?: "FULL_SYNC" | "INCREMENTAL_SYNC";
  };

  if (!resourceType) {
    return Response.json({ error: "Resource type is required" }, { status: 400 });
  }

  try {
    const result = await syncService.syncResources({
      shopId: shop.id,
      resourceType,
      operation,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
