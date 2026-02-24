import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useNavigate } from "react-router";
import {
  Page,
  BlockStack,
  Text,
  ProgressBar,
  Icon,
  Box,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * Post-OAuth Installation Route
 *
 * Flow:
 * 1. User installs app → OAuth completes → Redirects here
 * 2. Show loading screen with progress
 * 3. Fetch shop info from Shopify GraphQL
 * 4. Create/update shop record in database
 * 5. Initialize default languages
 * 6. Check subscription status
 * 7. Redirect to onboarding (no subscription) or dashboard (has subscription)
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  try {
    // Check if shop already exists
    const existingShop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop },
      include: {
        subscription: true,
        languages: { include: { language: true } },
      },
    });

    // If shop exists with active subscription, skip to dashboard
    if (
      existingShop &&
      existingShop.subscription?.status === "ACTIVE" &&
      existingShop.isActive
    ) {
      console.log(
        `✅ Shop ${session.shop} already configured - redirect to dashboard`,
      );
      throw new Response(null, {
        status: 302,
        headers: { Location: "/app/dashboard" },
      });
    }

    // Fetch shop info from Shopify GraphQL
    const shopInfoQuery = `
      query GetShopInfo {
        shop {
          id
          name
          email
          currencyCode
          ianaTimezone
          plan {
            displayName
          }
          primaryDomain {
            host
          }
        }
      }
    `;

    const shopInfoResponse = await admin.graphql(shopInfoQuery);
    const shopInfoData = await shopInfoResponse.json();
    const shopInfo = shopInfoData.data.shop;

    // Fetch shop locales
    const localesQuery = `
      query GetShopLocales {
        shopLocales {
          locale
          name
          primary
          published
        }
      }
    `;

    const localesResponse = await admin.graphql(localesQuery);
    const localesData = await localesResponse.json();
    const shopLocales = localesData.data.shopLocales;

    console.log(`📦 Fetched shop info for ${shopInfo.name}:`, {
      email: shopInfo.email,
      currency: shopInfo.currencyCode,
      timezone: shopInfo.ianaTimezone,
      plan: shopInfo.plan.displayName,
      locales: shopLocales.length,
    });

    // Create or update shop record
    const shop = await prisma.shop.upsert({
      where: { shopifyDomain: session.shop },
      create: {
        shopifyDomain: session.shop,
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currencyCode,
        timezone: shopInfo.ianaTimezone,
        plan: shopInfo.plan.displayName,
        country:
          shopInfo.primaryDomain.host.split(".").pop()?.toUpperCase() || "US",
        isActive: true,
        installedAt: new Date(),
      },
      update: {
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currencyCode,
        timezone: shopInfo.ianaTimezone,
        plan: shopInfo.plan.displayName,
        isActive: true,
        uninstalledAt: null, // Clear uninstall timestamp if reinstalling
      },
    });

    console.log(`✅ Shop ${shop.id} initialized successfully`);

    // Initialize default languages from shop locales
    const primaryLocale = shopLocales.find(
      (l: { primary: boolean }) => l.primary,
    );
    const primaryLanguageCode = primaryLocale?.locale || "en";

    // Find or create primary language in Language table
    let primaryLanguage = await prisma.language.findUnique({
      where: { code: primaryLanguageCode },
    });

    if (!primaryLanguage) {
      // Fallback: Get English if primary language not found
      primaryLanguage = await prisma.language.findUnique({
        where: { code: "en" },
      });

      if (!primaryLanguage) {
        throw new Error(
          "Default languages not seeded. Run: npm run prisma db seed",
        );
      }
    }

    // Create ShopLanguage for primary language (if not exists)
    await prisma.shopLanguage.upsert({
      where: {
        shopId_languageId: {
          shopId: shop.id,
          languageId: primaryLanguage.id,
        },
      },
      create: {
        shopId: shop.id,
        languageId: primaryLanguage.id,
        isDefault: true,
        isPublished: true,
        autoTranslate: false, // User will enable this in settings
      },
      update: {
        isPublished: true,
      },
    });

    console.log(`✅ Default language ${primaryLanguageCode} configured`);

    // Check if reinstall scenario (had subscription before)
    if (existingShop && existingShop.subscription) {
      // Cancel old subscription
      await prisma.shopSubscription.update({
        where: { id: existingShop.subscription.id },
        data: { status: "CANCELLED" },
      });
      console.log(`♻️ Cancelled old subscription for reinstalled shop`);
    }

    // Auto-activate FREE plan
    const freePlan = await prisma.billingPlan.findFirst({
      where: { name: "Free" },
    });

    if (freePlan) {
      // Create free subscription
      await prisma.shopSubscription.upsert({
        where: { shopId: shop.id },
        create: {
          shopId: shop.id,
          planId: freePlan.id,
          status: "ACTIVE",
        },
        update: {
          planId: freePlan.id,
          status: "ACTIVE",
        },
      });

      // Create token wallet with initial balance
      await prisma.tokenWallet.upsert({
        where: { shopId: shop.id },
        create: {
          shopId: shop.id,
          balance: 15000, // Free plan gets 15k tokens
        },
        update: {
          balance: 15000,
        },
      });

      console.log(`✅ Auto-activated Free plan for ${shop.name}`);
    }

    // Return initialization status
    return Response.json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        primaryLanguage: primaryLanguageCode,
      },
      hasSubscription: true, // Free plan auto-activated
    });
  } catch (error) {
    console.error("❌ Shop initialization failed:", error);

    // Check if error is a redirect response
    if (error instanceof Response) {
      throw error;
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

/**
 * Loading Screen Component
 * Shows progress bar and initialization steps
 */
export default function InstallPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Connecting to your store...",
    "Fetching store information...",
    "Setting up your account...",
    "Configuring languages...",
    "Almost ready...",
  ];

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // Animate step messages
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const maxStep = steps.length - 1;
        if (prev >= maxStep) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    // After initialization completes, auto-activate free plan and go to chat
    const redirectTimer = setTimeout(() => {
      // Skip onboarding, go directly to chat interface
      navigate("/app/chat");
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(redirectTimer);
    };
  }, [navigate, steps.length]);

  return (
    <Page>
      <Box padding="0" minHeight="100vh" background="bg-surface-secondary">
        <BlockStack align="center" inlineAlign="center" gap="800" as="section">
          {/* Logo */}
          <Box paddingBlockStart="1600">
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Transcy Logo Placeholder - Replace with your actual logo */}
              <circle cx="50" cy="50" r="40" fill="#5C6AC4" />
              <path
                d="M50 20 L50 80 M20 50 L80 50"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
          </Box>

          {/* Welcome Text */}
          <BlockStack align="center" gap="200">
            <Text as="h1" variant="heading2xl" alignment="center">
              Welcome to Transcy!
            </Text>
            <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
              {steps[currentStep]}
            </Text>
          </BlockStack>

          {/* Progress Bar */}
          <Box width="400px" maxWidth="90%">
            <ProgressBar progress={progress} size="small" tone="primary" />
          </Box>

          {/* Step Indicators */}
          <BlockStack gap="300" align="center">
            {steps.map((step, index) => (
              <Box
                key={index}
                paddingInline="400"
                paddingBlock="200"
                background={
                  index <= currentStep
                    ? "bg-surface-success-active"
                    : "bg-surface"
                }
                borderRadius="200"
                minWidth="300px"
              >
                <BlockStack gap="100" inlineAlign="start">
                  <Box>
                    {index < currentStep ? (
                      <Icon source={CheckIcon} tone="success" />
                    ) : index === currentStep ? (
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #5C6AC4",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #E4E5E7",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                  </Box>
                  <Text
                    as="span"
                    variant="bodySm"
                    tone={index <= currentStep ? "base" : "subdued"}
                  >
                    {step}
                  </Text>
                </BlockStack>
              </Box>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </Page>
  );
}
