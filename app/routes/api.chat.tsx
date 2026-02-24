import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import llmRouterService from "~/services/llm-router.service";
import prisma from "~/db.server";

/**
 * GET /api/chat/conversations - Get all conversations for shop
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const conversations = await prisma.chatConversation.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1, // Latest message only for list view
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return Response.json({ conversations });
};

/**
 * POST /api/chat - Send chat message
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
  const { message, conversationId } = body as {
    message: string;
    conversationId?: string;
  };

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const response = await llmRouterService.processPrompt({
      shopId: shop.id,
      message,
      conversationId,
    });

    return Response.json(response);
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
