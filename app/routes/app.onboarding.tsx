import { useState, useCallback } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Grid,
  Box,
  Divider,
  Banner,
  Icon,
  ProgressBar,
} from "@shopify/polaris";
import {
  CheckIcon,
  StarFilledIcon,
  GlobeIcon,
  LanguageTranslateIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import billingService from "~/services/billing.service";

interface LoaderData {
  shop: {
    shopifyDomain: string;
    name: string;
    email: string | null;
  };
  plans: Array<{
    id: string;
    name: string;
    price: number;
    interval: string;
    maxLanguages: number;
    maxProducts: number;
    googleTranslations: number;
    includesImageTrans: boolean;
    includesGlossary: boolean;
    priority: number;
  }>;
  currentStep: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get shop (should already exist from /app/install route)
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    include: { subscription: true },
  });

  if (!shop) {
    // Shop not initialized yet - redirect to install route
    console.warn(
      `⚠️ Shop ${session.shop} not found in database - redirecting to install route`,
    );
    throw new Response(null, {
      status: 302,
      headers: { Location: "/app/install" },
    });
  }

  // If already has active subscription, redirect to dashboard
  if (shop.subscription?.status === "ACTIVE") {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/app/dashboard" },
    });
  }

  // Get available plans
  const plans = await billingService.getPlans();

  return {
    shop: {
      shopifyDomain: shop.shopifyDomain,
      name: shop.name,
      email: shop.email,
    },
    plans,
    currentStep: shop.subscription ? 2 : 1,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("planId") as string;

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  try {
    // Create subscription with Shopify Billing API
    const result = await billingService.createSubscription(
      shop.id,
      planId,
      admin,
    );

    return Response.json(result);
  } catch (error) {
    console.error("Subscription error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
};

export default function Onboarding() {
  const { shop, plans, currentStep: initialStep } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handleContinue = useCallback(() => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedPlan) {
      setStep(3);
    }
  }, [step, selectedPlan]);

  const handleBack = useCallback(() => {
    setStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleConfirmSubscription = useCallback(async () => {
    if (!selectedPlan) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("planId", selectedPlan);

      const response = await fetch("/app/onboarding", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.confirmationUrl) {
        // Redirect to Shopify billing confirmation
        window.location.href = result.confirmationUrl;
      } else if (result.success) {
        // Free plan - no charge needed
        navigate("/app/dashboard");
      } else {
        alert(result.error || "Failed to create subscription");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to create subscription. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlan, navigate]);

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  const getPlanBadge = (planName: string) => {
    if (planName === "Enterprise") return <Badge tone="success">Popular</Badge>;
    if (planName === "Professional")
      return <Badge tone="info">Best Value</Badge>;
    return null;
  };

  return (
    <Page title="Welcome to IconTran! 🎉">
      <BlockStack gap="600">
        {/* Progress Bar */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Setup Progress
              </Text>
              <Text as="span" variant="bodyMd" tone="subdued">
                Step {step} of 3
              </Text>
            </InlineStack>
            <ProgressBar progress={(step / 3) * 100} size="small" />
          </BlockStack>
        </Card>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card>
            <BlockStack gap="600">
              <Box paddingBlock="400">
                <BlockStack gap="400" align="center">
                  <Box
                    padding="400"
                    background="bg-fill-info"
                    borderRadius="200"
                  >
                    <Icon source={GlobeIcon} tone="info" />
                  </Box>

                  <Text as="h1" variant="headingLg" alignment="center">
                    Translate Your Store to{" "}
                    <Text as="span" tone="success">
                      15+ Languages
                    </Text>
                  </Text>

                  <Text
                    as="p"
                    variant="bodyLg"
                    alignment="center"
                    tone="subdued"
                  >
                    Welcome to IconTran, {shop.name}! 👋
                  </Text>

                  <Text as="p" variant="bodyMd" alignment="center">
                    Expand your global reach with AI-powered translation that
                    understands your products and brand voice.
                  </Text>
                </BlockStack>
              </Box>

              <Divider />

              {/* Features */}
              <Grid columns={{ xs: 1, sm: 2, md: 3 }}>
                <Box padding="400">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={LanguageTranslateIcon} tone="success" />
                      <Text as="h3" variant="headingSm">
                        AI Chat Interface
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Control everything with natural language commands
                    </Text>
                  </BlockStack>
                </Box>

                <Box padding="400">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text as="h3" variant="headingSm">
                        3 Translation Engines
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Google Translate, OpenAI GPT-4, Gemini AI
                    </Text>
                  </BlockStack>
                </Box>

                <Box padding="400">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={StarFilledIcon} tone="warning" />
                      <Text as="h3" variant="headingSm">
                        Auto-Translation
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Automatically translate new products & collections
                    </Text>
                  </BlockStack>
                </Box>
              </Grid>

              <Divider />

              <InlineStack align="end">
                <Button variant="primary" size="large" onClick={handleContinue}>
                  Get Started →
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Step 2: Plan Selection */}
        {step === 2 && (
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Choose Your Plan
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Select the plan that best fits your needs. You can upgrade or
                  downgrade anytime.
                </Text>
              </BlockStack>
            </Card>

            <Grid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start">
                      <Text as="h3" variant="headingMd">
                        {plan.name}
                      </Text>
                      {getPlanBadge(plan.name)}
                    </InlineStack>

                    <Box>
                      <InlineStack align="start" blockAlign="end" gap="100">
                        <Text as="p" variant="heading2xl">
                          ${plan.price}
                        </Text>
                        <Text as="span" variant="bodyMd" tone="subdued">
                          /{plan.interval.toLowerCase()}
                        </Text>
                      </InlineStack>
                    </Box>

                    <Divider />

                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span" variant="bodyMd">
                          {plan.maxLanguages === 999
                            ? "Unlimited"
                            : plan.maxLanguages}{" "}
                          Languages
                        </Text>
                      </InlineStack>

                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span" variant="bodyMd">
                          {plan.maxProducts === 999999
                            ? "Unlimited"
                            : plan.maxProducts.toLocaleString()}{" "}
                          Products
                        </Text>
                      </InlineStack>

                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span" variant="bodyMd">
                          {plan.googleTranslations.toLocaleString()} Free
                          Translations
                        </Text>
                      </InlineStack>

                      {plan.includesImageTrans && (
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={CheckIcon} tone="success" />
                          <Text as="span" variant="bodyMd">
                            Image Translation
                          </Text>
                        </InlineStack>
                      )}

                      {plan.includesGlossary && (
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={CheckIcon} tone="success" />
                          <Text as="span" variant="bodyMd">
                            Custom Glossary
                          </Text>
                        </InlineStack>
                      )}
                    </BlockStack>

                    <Button
                      variant={selectedPlan === plan.id ? "primary" : "plain"}
                      size="large"
                      fullWidth
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      {selectedPlan === plan.id ? "Selected ✓" : "Select Plan"}
                    </Button>
                  </BlockStack>
                </Card>
              ))}
            </Grid>

            <Card>
              <InlineStack align="space-between">
                <Button onClick={handleBack}>← Back</Button>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleContinue}
                  disabled={!selectedPlan}
                >
                  Continue to Checkout →
                </Button>
              </InlineStack>
            </Card>
          </BlockStack>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && selectedPlanData && (
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Confirm Your Subscription
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Review your plan details before proceeding.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="600">
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">
                      {selectedPlanData.name} Plan
                    </Text>
                    <Badge tone="success">
                      {getPlanBadge(selectedPlanData.name)}
                    </Badge>
                  </InlineStack>

                  <Box
                    padding="400"
                    background="bg-fill-secondary"
                    borderRadius="200"
                  >
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyLg">
                        Total Amount
                      </Text>
                      <Text as="span" variant="headingLg">
                        ${selectedPlanData.price}/
                        {selectedPlanData.interval.toLowerCase()}
                      </Text>
                    </InlineStack>
                  </Box>
                </BlockStack>

                <Divider />

                <BlockStack gap="300">
                  <Text as="h4" variant="headingSm">
                    What&apos;s included:
                  </Text>

                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text as="span" variant="bodyMd">
                        {selectedPlanData.maxLanguages === 999
                          ? "Unlimited"
                          : selectedPlanData.maxLanguages}{" "}
                        Languages
                      </Text>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text as="span" variant="bodyMd">
                        {selectedPlanData.maxProducts === 999999
                          ? "Unlimited"
                          : selectedPlanData.maxProducts.toLocaleString()}{" "}
                        Products
                      </Text>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text as="span" variant="bodyMd">
                        {selectedPlanData.googleTranslations.toLocaleString()}{" "}
                        Free Google Translations
                      </Text>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckIcon} tone="success" />
                      <Text as="span" variant="bodyMd">
                        AI Chat Interface with GPT-4
                      </Text>
                    </InlineStack>

                    {selectedPlanData.includesImageTrans && (
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span" variant="bodyMd">
                          Image Translation
                        </Text>
                      </InlineStack>
                    )}

                    {selectedPlanData.includesGlossary && (
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span" variant="bodyMd">
                          Custom Glossary Management
                        </Text>
                      </InlineStack>
                    )}
                  </BlockStack>
                </BlockStack>

                {selectedPlanData.price > 0 && (
                  <Banner tone="info">
                    <p>
                      You will be redirected to Shopify to complete the payment.
                      Your subscription will start immediately after
                      confirmation.
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </Card>

            <Card>
              <InlineStack align="space-between">
                <Button onClick={handleBack} disabled={isLoading}>
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleConfirmSubscription}
                  loading={isLoading}
                >
                  {selectedPlanData.price > 0
                    ? "Proceed to Payment →"
                    : "Start Free Plan →"}
                </Button>
              </InlineStack>
            </Card>
          </BlockStack>
        )}
      </BlockStack>
    </Page>
  );
}
