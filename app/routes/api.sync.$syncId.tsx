import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import syncService from "~/services/sync.service";
import prisma from "~/db.server";

/**
 * GET /api/sync/:syncId - Get sync progress
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const { syncId } = params;

  if (!syncId) {
    return Response.json({ error: "Sync ID required" }, { status: 400 });
  }

  try {
    const progress = await syncService.getSyncProgress(syncId);
    return Response.json(progress);
  } catch (error) {
    console.error("Get sync progress error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
