import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import webhookQueue from "~/queues/webhook.queue";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`📨 Received webhook: ${topic} from ${shop}`);

  if (!shop) {
    return new Response("Shop not found", { status: 400 });
  }

  try {
    // Find shop in database
    const shopRecord = await prisma.shop.findUnique({
      where: { shopifyDomain: shop },
    });

    if (!shopRecord) {
      console.warn(`Shop ${shop} not found in database`);
      return new Response("Shop not found in database", { status: 404 });
    }

    // Create webhook event record
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        shopId: shopRecord.id,
        topic,
        payload: payload as never,
        processed: false,
      },
    });

    // Add to webhook queue for processing
    await webhookQueue.add({
      webhookEventId: webhookEvent.id,
      shopId: shopRecord.id,
      topic,
      payload: payload as Record<string, unknown>,
    });

    console.log(`✅ Webhook ${topic} queued for processing`);

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error(`❌ Error processing webhook ${topic}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
