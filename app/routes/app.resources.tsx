import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { shopService } from "~/services/shop.service";
import {
  Card,
  Page,
  Layout,
  EmptyState,
  DataTable,
  Badge,
  Select,
  TextField,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Pagination,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

interface LoaderData {
  resources: Array<{
    id: number;
    shopifyResourceId: string;
    type: string;
    title: string;
    handle: string;
    status: string;
    language: {
      code: string;
      name: string;
    };
    translationProgress: number;
    updatedAt: string;
  }>;
  languages: Array<{ code: string; name: string }>;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  filters: {
    type?: string;
    status?: string;
    languageCode?: string;
    search?: string;
  };
}

/**
 * Resources management page
 * Displays all products, collections, etc. with filtering and bulk actions
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Parse filters from query params
  const filters = {
    type: url.searchParams.get("type") || undefined,
    status: url.searchParams.get("status") || undefined,
    languageCode: url.searchParams.get("language") || undefined,
    search: url.searchParams.get("search") || undefined,
  };

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 25;
  const skip = (page - 1) * limit;

  // Get shop languages for filter dropdown
  const shopLanguages = await shopService.getShopLanguages(session.shop);

  // Build Prisma where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    shop: { shopifyDomain: session.shop },
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.languageCode) {
    where.languageCode = filters.languageCode;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { handle: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Fetch resources with pagination
  const [resources, totalCount] = await Promise.all([
    shopService.prisma.resource.findMany({
      where,
      include: {
        language: {
          select: { code: true, name: true },
        },
        translations: {
          select: { status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    shopService.prisma.resource.count({ where }),
  ]);

  // Calculate translation progress for each resource
  const resourcesWithProgress = resources.map((resource) => ({
    id: resource.id,
    shopifyResourceId: resource.shopifyResourceId,
    type: resource.type,
    title: resource.title,
    handle: resource.handle,
    status: resource.status,
    language: resource.language,
    translationProgress: resource.translations.length
      ? Math.round(
          (resource.translations.filter((t) => t.status === "COMPLETED")
            .length /
            resource.translations.length) *
            100,
        )
      : 0,
    updatedAt: resource.updatedAt.toISOString(),
  }));

  return {
    resources: resourcesWithProgress,
    languages: shopLanguages.map((sl) => ({
      code: sl.language.code,
      name: sl.language.name,
    })),
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    filters,
  };
};

export default function Resources() {
  const data = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Local state for filters
  const [typeFilter, setTypeFilter] = useState(data.filters.type || "");
  const [statusFilter, setStatusFilter] = useState(data.filters.status || "");
  const [languageFilter, setLanguageFilter] = useState(
    data.filters.languageCode || "",
  );
  const [searchQuery, setSearchQuery] = useState(data.filters.search || "");

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    const params = new URLSearchParams();

    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (languageFilter) params.set("language", languageFilter);
    if (searchQuery) params.set("search", searchQuery);
    params.set("page", "1"); // Reset to first page

    navigate(`/app/resources?${params.toString()}`);
  }, [typeFilter, statusFilter, languageFilter, searchQuery, navigate]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setTypeFilter("");
    setStatusFilter("");
    setLanguageFilter("");
    setSearchQuery("");
    navigate("/app/resources");
  }, [navigate]);

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (data.currentPage > 1) {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(data.currentPage - 1));
      navigate(`/app/resources?${params.toString()}`);
    }
  }, [data.currentPage, searchParams, navigate]);

  const handleNextPage = useCallback(() => {
    if (data.currentPage < data.totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(data.currentPage + 1));
      navigate(`/app/resources?${params.toString()}`);
    }
  }, [data.currentPage, data.totalPages, searchParams, navigate]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Badge status mapping
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "attention" | "warning"> = {
      ACTIVE: "success",
      DRAFT: "attention",
      ARCHIVED: "warning",
    };
    return (
      <Badge tone={statusMap[status] || "info"}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  // Badge type mapping
  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, "info" | "success"> = {
      PRODUCT: "info",
      COLLECTION: "success",
    };
    return (
      <Badge tone={typeColors[type] || "info"}>
        {type.charAt(0) + type.slice(1).toLowerCase()}
      </Badge>
    );
  };

  // Progress badge
  const getProgressBadge = (progress: number) => {
    if (progress === 100)
      return <Badge tone="success">{progress}% Complete</Badge>;
    if (progress > 0)
      return <Badge tone="attention">{progress}% In Progress</Badge>;
    return <Badge tone="warning">Not Started</Badge>;
  };

  // Prepare table rows
  const rows = data.resources.map((resource) => [
    getTypeBadge(resource.type),
    resource.title,
    resource.handle,
    `${resource.language.name} (${resource.language.code})`,
    getStatusBadge(resource.status),
    getProgressBadge(resource.translationProgress),
    formatDate(resource.updatedAt),
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="No resources found"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>
        {data.filters.search || data.filters.type || data.filters.status
          ? "Try adjusting your filters or search query."
          : "Start by syncing your products and collections from the Dashboard."}
      </p>
    </EmptyState>
  );

  return (
    <Page
      title="Resources"
      subtitle={`Manage your translated products and collections (${data.totalCount} total)`}
      primaryAction={{
        content: "Sync Now",
        onAction: () => navigate("/app/dashboard"),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Filters */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400" blockAlign="end">
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      label="Search"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search by title or handle..."
                      autoComplete="off"
                    />
                  </div>

                  <Select
                    label="Type"
                    options={[
                      { label: "All Types", value: "" },
                      { label: "Product", value: "PRODUCT" },
                      { label: "Collection", value: "COLLECTION" },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                  />

                  <Select
                    label="Status"
                    options={[
                      { label: "All Status", value: "" },
                      { label: "Active", value: "ACTIVE" },
                      { label: "Draft", value: "DRAFT" },
                      { label: "Archived", value: "ARCHIVED" },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />

                  <Select
                    label="Language"
                    options={[
                      { label: "All Languages", value: "" },
                      ...data.languages.map((lang) => ({
                        label: `${lang.name} (${lang.code})`,
                        value: lang.code,
                      })),
                    ]}
                    value={languageFilter}
                    onChange={setLanguageFilter}
                  />
                </InlineStack>

                <InlineStack gap="200">
                  <ButtonGroup>
                    <Button onClick={handleApplyFilters} variant="primary">
                      Apply Filters
                    </Button>
                    <Button onClick={handleClearFilters}>Clear</Button>
                  </ButtonGroup>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Resources Table */}
            {data.resources.length === 0 ? (
              <Card>{emptyStateMarkup}</Card>
            ) : (
              <Card>
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "Type",
                    "Title",
                    "Handle",
                    "Language",
                    "Status",
                    "Translation Progress",
                    "Last Updated",
                  ]}
                  rows={rows}
                  footerContent={
                    data.totalPages > 1 ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          paddingTop: "16px",
                        }}
                      >
                        <Pagination
                          hasPrevious={data.currentPage > 1}
                          onPrevious={handlePreviousPage}
                          hasNext={data.currentPage < data.totalPages}
                          onNext={handleNextPage}
                          label={`Page ${data.currentPage} of ${data.totalPages}`}
                        />
                      </div>
                    ) : undefined
                  }
                />
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
