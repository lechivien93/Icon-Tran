import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`📦 Received ${topic} webhook for ${shop}`);

  try {
    // Mark shop as uninstalled (keep data for potential reinstall)
    const shopRecord = await db.shop.findUnique({
      where: { shopifyDomain: shop },
      include: { subscription: true },
    });

    if (shopRecord) {
      // Update shop uninstall timestamp
      await db.shop.update({
        where: { id: shopRecord.id },
        data: {
          isActive: false,
          uninstalledAt: new Date(),
        },
      });

      // Cancel active subscription
      if (shopRecord.subscription) {
        await db.shopSubscription.update({
          where: { id: shopRecord.subscription.id },
          data: {
            status: "CANCELLED",
          },
        });
      }

      console.log(`✅ Marked shop ${shop} as uninstalled`);
    }

    // Delete sessions
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log(`✅ Deleted sessions for ${shop}`);
    }
  } catch (error) {
    console.error(`❌ Error handling uninstall for ${shop}:`, error);
  }

  return new Response();
};
