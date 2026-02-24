import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Badge,
  Button,
  EmptyState,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    include: {
      subscription: {
        include: { plan: true },
      },
      tokenWallet: true,
      languages: {
        include: { language: true },
      },
    },
  });

  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  // Get stats
  const [totalResources, translatedResources, pendingJobs, recentSyncs] =
    await Promise.all([
      prisma.resource.count({
        where: { shopId: shop.id },
      }),
      prisma.resource.count({
        where: {
          shopId: shop.id,
          translationStatus: "COMPLETED",
        },
      }),
      prisma.translationJob.count({
        where: {
          resource: { shopId: shop.id },
          status: { in: ["PENDING", "PROCESSING"] },
        },
      }),
      prisma.syncHistory.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    shop,
    stats: {
      totalResources,
      translatedResources,
      pendingJobs,
    },
    recentSyncs,
  };
};

export default function DashboardPage() {
  const { shop, stats, recentSyncs } = useLoaderData<typeof loader>();

  const translationProgress =
    stats.totalResources > 0
      ? Math.round((stats.translatedResources / stats.totalResources) * 100)
      : 0;

  return (
    <Page
      title={`Welcome back, ${shop.name}!`}
      subtitle="Manage your multilingual content with AI"
    >
      <BlockStack gap="500">
        {/* Stats Cards */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Total Resources
              </Text>
              <Text as="p" variant="heading2xl">
                {stats.totalResources}
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Translation Progress
              </Text>
              <InlineStack gap="200" align="start" blockAlign="center">
                <Text as="p" variant="heading2xl">
                  {translationProgress}%
                </Text>
                <Badge
                  tone={translationProgress === 100 ? "success" : "attention"}
                >
                  {stats.translatedResources}/{stats.totalResources}
                </Badge>
              </InlineStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Pending Jobs
              </Text>
              <Text as="p" variant="heading2xl">
                {stats.pendingJobs}
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Token Balance
              </Text>
              <Text as="p" variant="heading2xl">
                {shop.tokenWallet?.balance?.toLocaleString() || 0}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Quick Actions
            </Text>
            <InlineStack gap="300" wrap>
              <Link to="/app/chat">
                <Button variant="primary">🤖 Chat with AI Assistant</Button>
              </Link>
              <Link to="/app/resources?action=sync">
                <Button>🔄 Sync from Shopify</Button>
              </Link>
              <Link to="/app/settings">
                <Button>⚙️ Settings</Button>
              </Link>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Current Subscription */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Current Plan
            </Text>
            {shop.subscription ? (
              <InlineStack gap="400" align="space-between">
                <BlockStack gap="200">
                  <InlineStack gap="200" align="start">
                    <Text as="p" variant="headingLg">
                      {shop.subscription.plan.name}
                    </Text>
                    <Badge
                      tone={
                        shop.subscription.status === "ACTIVE"
                          ? "success"
                          : "attention"
                      }
                    >
                      {shop.subscription.status}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    ${shop.subscription.plan.price}/
                    {shop.subscription.plan.interval.toLowerCase()}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    • Up to {shop.subscription.plan.maxLanguages} languages
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    •{" "}
                    {shop.subscription.plan.googleTranslations.toLocaleString()}{" "}
                    Google translations/month
                  </Text>
                </BlockStack>
                <Button>Manage Billing</Button>
              </InlineStack>
            ) : (
              <EmptyState
                heading="No active subscription"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd">
                  Choose a plan to unlock powerful translation features
                </Text>
                <Box paddingBlockStart="300">
                  <Button variant="primary">View Plans</Button>
                </Box>
              </EmptyState>
            )}
          </BlockStack>
        </Card>

        {/* Active Languages */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Active Languages
            </Text>
            {shop.languages.length > 0 ? (
              <InlineStack gap="200" wrap>
                {shop.languages.map((sl) => (
                  <Badge key={sl.id} tone={sl.isDefault ? "info" : "default"}>
                    {sl.language.nativeName} ({sl.language.code})
                    {sl.isDefault && " ★"}
                  </Badge>
                ))}
              </InlineStack>
            ) : (
              <EmptyState
                heading="No languages configured"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd">
                  Add languages to start translating your content
                </Text>
                <Box paddingBlockStart="300">
                  <Link to="/app/settings">
                    <Button>Add Languages</Button>
                  </Link>
                </Box>
              </EmptyState>
            )}
          </BlockStack>
        </Card>

        {/* Recent Sync History */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Recent Syncs
            </Text>
            {recentSyncs.length > 0 ? (
              <BlockStack gap="300">
                {recentSyncs.map((sync) => (
                  <Box
                    key={sync.id}
                    background="bg-surface-secondary"
                    padding="300"
                    borderRadius="200"
                  >
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <InlineStack gap="200">
                          <Text
                            as="span"
                            variant="bodyMd"
                            fontWeight="semibold"
                          >
                            {sync.resourceType}
                          </Text>
                          <Badge
                            tone={
                              sync.status === "COMPLETED"
                                ? "success"
                                : sync.status === "FAILED"
                                  ? "critical"
                                  : "attention"
                            }
                          >
                            {sync.status}
                          </Badge>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {new Date(sync.createdAt).toLocaleString()}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm">
                          {sync.processedItems}/{sync.totalItems} items
                        </Text>
                        {sync.failedItems > 0 && (
                          <Text as="p" variant="bodySm" tone="critical">
                            {sync.failedItems} failed
                          </Text>
                        )}
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : (
              <EmptyState
                heading="No sync history"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd">
                  Sync your Shopify data to get started
                </Text>
              </EmptyState>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
