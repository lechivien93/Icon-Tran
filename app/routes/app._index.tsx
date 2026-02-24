import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Index route - smart redirect based on install/subscription status
 *
 * Flow:
 * 1. Check if shop exists in DB
 * 2. If not exists → First time install → Redirect to /app/install (initialize shop)
 * 3. If exists but inactive/uninstalled → Reinstall → Redirect to /app/install (reinitialize)
 * 4. If exists but no active subscription → Redirect to /app/onboarding (plan selection)
 * 5. If has active subscription → Redirect to /app/dashboard
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Check if shop exists and has subscription
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  // First time install - redirect to initialization
  if (!shop) {
    console.log(
      `🆕 First time install for ${session.shop} - redirecting to install`,
    );
    return redirect("/app/install");
  }

  // Shop was uninstalled and now reinstalling - redirect to reinitialize
  if (shop.uninstalledAt !== null || !shop.isActive) {
    console.log(
      `♻️ Shop ${session.shop} reinstalling - redirecting to install for reinitialization`,
    );
    return redirect("/app/install");
  }

  // Shop exists but no active subscription - redirect to onboarding
  if (!shop.subscription || shop.subscription.status !== "ACTIVE") {
    console.log(
      `📋 Shop ${session.shop} needs subscription - redirecting to onboarding`,
    );
    return redirect("/app/onboarding");
  }

  // Shop has active subscription - redirect to chat interface
  console.log(
    `✅ Shop ${session.shop} fully configured - redirecting to AI chat`,
  );
  return redirect("/app/chat");
};
