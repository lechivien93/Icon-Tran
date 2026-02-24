import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GET /api/resources - Get resources with optional filters
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {
    shopId: shop.id,
  };

  if (type) {
    where.type = type;
  }

  if (status) {
    where.translationStatus = status;
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        fields: true,
        translations: {
          include: {
            language: true,
          },
        },
        _count: {
          select: {
            translations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.resource.count({ where }),
  ]);

  return Response.json({
    resources,
    pagination: {
      total,
      page,
      limit,
      hasMore: page * limit < total,
    },
  });
};
