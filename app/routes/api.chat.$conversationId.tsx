import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GET /api/chat/conversations/:conversationId - Get conversation with messages
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const { conversationId } = params;

  if (!conversationId) {
    return Response.json({ error: "Conversation ID required" }, { status: 400 });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: {
      id: conversationId,
      shopId: shop.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ conversation });
};
