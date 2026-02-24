import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { shopService } from "~/services/shop.service";
import {
  Card,
  Page,
  Layout,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Checkbox,
  Select,
  TextField,
  Banner,
  DataTable,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

interface LoaderData {
  shop: {
    shopifyDomain: string;
    autoTranslateOnCreate: boolean;
    autoTranslateOnUpdate: boolean;
  };
  availableLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
  shopLanguages: Array<{
    id: number;
    languageCode: string;
    language: { code: string; name: string; nativeName: string };
    isDefault: boolean;
    isActive: boolean;
  }>;
  glossary: Array<{
    id: number;
    sourceText: string;
    targetText: string;
    sourceLanguage: string;
    targetLanguage: string;
  }>;
}

/**
 * Settings page
 * Manage languages, auto-translation, and glossary
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get shop settings
  const shop = await shopService.prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    select: {
      shopifyDomain: true,
      autoTranslateOnCreate: true,
      autoTranslateOnUpdate: true,
    },
  });

  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  // Get all available languages
  const availableLanguages = await shopService.prisma.language.findMany({
    select: { code: true, name: true, nativeName: true },
    orderBy: { name: "asc" },
  });

  // Get shop languages
  const shopLanguages = await shopService.getShopLanguages(session.shop);

  // Get glossary terms
  const glossary = await shopService.prisma.glossaryTerm.findMany({
    where: {
      shop: { shopifyDomain: session.shop },
    },
    select: {
      id: true,
      sourceText: true,
      targetText: true,
      sourceLanguage: true,
      targetLanguage: true,
    },
    orderBy: { sourceText: "asc" },
  });

  return {
    shop,
    availableLanguages,
    shopLanguages,
    glossary,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  try {
    switch (actionType) {
      case "addLanguage": {
        const languageCode = formData.get("languageCode") as string;
        await shopService.addLanguageToShop(session.shop, languageCode);
        return { success: true, message: "Language added successfully" };
      }

      case "setDefaultLanguage": {
        const languageId = parseInt(formData.get("languageId") as string);
        await shopService.setDefaultLanguage(session.shop, languageId);
        return {
          success: true,
          message: "Default language updated successfully",
        };
      }

      case "toggleLanguage": {
        const languageId = parseInt(formData.get("languageId") as string);
        const isActive = formData.get("isActive") === "true";

        await shopService.prisma.shopLanguage.update({
          where: { id: languageId },
          data: { isActive },
        });

        return {
          success: true,
          message: `Language ${isActive ? "activated" : "deactivated"}`,
        };
      }

      case "updateAutoTranslate": {
        const autoTranslateOnCreate =
          formData.get("autoTranslateOnCreate") === "true";
        const autoTranslateOnUpdate =
          formData.get("autoTranslateOnUpdate") === "true";

        await shopService.prisma.shop.update({
          where: { shopifyDomain: session.shop },
          data: {
            autoTranslateOnCreate,
            autoTranslateOnUpdate,
          },
        });

        return {
          success: true,
          message: "Auto-translate settings updated successfully",
        };
      }

      case "addGlossary": {
        const sourceText = formData.get("sourceText") as string;
        const targetText = formData.get("targetText") as string;
        const sourceLanguage = formData.get("sourceLanguage") as string;
        const targetLanguage = formData.get("targetLanguage") as string;

        const shop = await shopService.prisma.shop.findUnique({
          where: { shopifyDomain: session.shop },
        });

        if (!shop) {
          throw new Error("Shop not found");
        }

        await shopService.prisma.glossaryTerm.create({
          data: {
            shopId: shop.id,
            sourceText,
            targetText,
            sourceLanguage,
            targetLanguage,
          },
        });

        return { success: true, message: "Glossary term added successfully" };
      }

      case "deleteGlossary": {
        const glossaryId = parseInt(formData.get("glossaryId") as string);

        await shopService.prisma.glossaryTerm.delete({
          where: { id: glossaryId },
        });

        return { success: true, message: "Glossary term deleted successfully" };
      }

      default:
        return { success: false, message: "Invalid action" };
    }
  } catch (error) {
    console.error("Settings action error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed",
    };
  }
};

export default function Settings() {
  const data = useLoaderData<LoaderData>();
  const fetcher = useFetcher<{ success: boolean; message: string }>();

  // Language management state
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [autoTranslateOnCreate, setAutoTranslateOnCreate] = useState(
    data.shop.autoTranslateOnCreate,
  );
  const [autoTranslateOnUpdate, setAutoTranslateOnUpdate] = useState(
    data.shop.autoTranslateOnUpdate,
  );

  // Glossary modal state
  const [glossaryModalActive, setGlossaryModalActive] = useState(false);
  const [glossaryForm, setGlossaryForm] = useState({
    sourceText: "",
    targetText: "",
    sourceLanguage: "",
    targetLanguage: "",
  });

  // Add language
  const handleAddLanguage = useCallback(() => {
    if (selectedLanguage) {
      const formData = new FormData();
      formData.append("_action", "addLanguage");
      formData.append("languageCode", selectedLanguage);
      fetcher.submit(formData, { method: "post" });
      setSelectedLanguage("");
    }
  }, [selectedLanguage, fetcher]);

  // Toggle language active status
  const handleToggleLanguage = useCallback(
    (languageId: number, isActive: boolean) => {
      const formData = new FormData();
      formData.append("_action", "toggleLanguage");
      formData.append("languageId", String(languageId));
      formData.append("isActive", String(!isActive));
      fetcher.submit(formData, { method: "post" });
    },
    [fetcher],
  );

  // Set default language
  const handleSetDefaultLanguage = useCallback(
    (languageId: number) => {
      const formData = new FormData();
      formData.append("_action", "setDefaultLanguage");
      formData.append("languageId", String(languageId));
      fetcher.submit(formData, { method: "post" });
    },
    [fetcher],
  );

  // Update auto-translate settings
  const handleUpdateAutoTranslate = useCallback(() => {
    const formData = new FormData();
    formData.append("_action", "updateAutoTranslate");
    formData.append("autoTranslateOnCreate", String(autoTranslateOnCreate));
    formData.append("autoTranslateOnUpdate", String(autoTranslateOnUpdate));
    fetcher.submit(formData, { method: "post" });
  }, [autoTranslateOnCreate, autoTranslateOnUpdate, fetcher]);

  // Add glossary term
  const handleAddGlossary = useCallback(() => {
    const formData = new FormData();
    formData.append("_action", "addGlossary");
    formData.append("sourceText", glossaryForm.sourceText);
    formData.append("targetText", glossaryForm.targetText);
    formData.append("sourceLanguage", glossaryForm.sourceLanguage);
    formData.append("targetLanguage", glossaryForm.targetLanguage);
    fetcher.submit(formData, { method: "post" });

    setGlossaryModalActive(false);
    setGlossaryForm({
      sourceText: "",
      targetText: "",
      sourceLanguage: "",
      targetLanguage: "",
    });
  }, [glossaryForm, fetcher]);

  // Delete glossary term
  const handleDeleteGlossary = useCallback(
    (glossaryId: number) => {
      if (confirm("Are you sure you want to delete this glossary term?")) {
        const formData = new FormData();
        formData.append("_action", "deleteGlossary");
        formData.append("glossaryId", String(glossaryId));
        fetcher.submit(formData, { method: "post" });
      }
    },
    [fetcher],
  );

  // Get available languages for dropdown (exclude already added)
  const availableLanguagesForDropdown = data.availableLanguages.filter(
    (lang) => !data.shopLanguages.some((sl) => sl.languageCode === lang.code),
  );

  // Prepare glossary table rows
  const glossaryRows = data.glossary.map((term) => [
    term.sourceText,
    term.targetText,
    term.sourceLanguage.toUpperCase(),
    term.targetLanguage.toUpperCase(),
    <Button
      key={term.id}
      size="slim"
      variant="tertiary"
      tone="critical"
      onClick={() => handleDeleteGlossary(term.id)}
    >
      Delete
    </Button>,
  ]);

  return (
    <Page title="Settings" subtitle="Manage languages and translation settings">
      <Layout>
        {/* Success/Error Banner */}
        {fetcher.data && (
          <Layout.Section>
            <Banner
              tone={fetcher.data.success ? "success" : "critical"}
              onDismiss={() => {}}
            >
              <p>{fetcher.data.message}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Language Management */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Language Management
              </Text>

              {/* Add Language */}
              <InlineStack gap="200" blockAlign="end">
                <div style={{ flexGrow: 1 }}>
                  <Select
                    label="Add a language"
                    options={[
                      { label: "Select a language...", value: "" },
                      ...availableLanguagesForDropdown.map((lang) => ({
                        label: `${lang.name} (${lang.nativeName})`,
                        value: lang.code,
                      })),
                    ]}
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                    disabled={availableLanguagesForDropdown.length === 0}
                  />
                </div>
                <Button
                  onClick={handleAddLanguage}
                  disabled={!selectedLanguage}
                  variant="primary"
                >
                  Add Language
                </Button>
              </InlineStack>

              {/* Active Languages */}
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Active Languages ({data.shopLanguages.length})
                </Text>

                {data.shopLanguages.map((shopLang) => (
                  <Card key={shopLang.id}>
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodyMd">
                          {shopLang.language.name} ({shopLang.language.code})
                        </Text>
                        {shopLang.isDefault && (
                          <Badge tone="success">Default ★</Badge>
                        )}
                        {!shopLang.isActive && (
                          <Badge tone="warning">Inactive</Badge>
                        )}
                      </InlineStack>

                      <InlineStack gap="200">
                        {!shopLang.isDefault && (
                          <Button
                            size="slim"
                            onClick={() =>
                              handleSetDefaultLanguage(shopLang.id)
                            }
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          size="slim"
                          variant="tertiary"
                          onClick={() =>
                            handleToggleLanguage(shopLang.id, shopLang.isActive)
                          }
                          disabled={shopLang.isDefault}
                        >
                          {shopLang.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </Card>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Auto-Translation Settings */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Auto-Translation Settings
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                Automatically translate resources when they are created or
                updated in Shopify.
              </Text>

              <Checkbox
                label="Auto-translate on product/collection create"
                checked={autoTranslateOnCreate}
                onChange={setAutoTranslateOnCreate}
              />

              <Checkbox
                label="Auto-translate on product/collection update"
                checked={autoTranslateOnUpdate}
                onChange={setAutoTranslateOnUpdate}
              />

              <InlineStack align="end">
                <Button
                  onClick={handleUpdateAutoTranslate}
                  variant="primary"
                  disabled={
                    autoTranslateOnCreate === data.shop.autoTranslateOnCreate &&
                    autoTranslateOnUpdate === data.shop.autoTranslateOnUpdate
                  }
                >
                  Save Auto-Translate Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Glossary Management */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Glossary Management
                </Text>
                <Button
                  variant="primary"
                  onClick={() => setGlossaryModalActive(true)}
                >
                  Add Glossary Term
                </Button>
              </InlineStack>

              <Text as="p" variant="bodyMd" tone="subdued">
                Define custom translations for specific terms to ensure
                consistency across your store.
              </Text>

              {data.glossary.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={[
                    "Source Text",
                    "Target Text",
                    "Source Language",
                    "Target Language",
                    "Actions",
                  ]}
                  rows={glossaryRows}
                />
              ) : (
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  No glossary terms yet. Add your first term to get started.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Glossary Modal */}
      <Modal
        open={glossaryModalActive}
        onClose={() => setGlossaryModalActive(false)}
        title="Add Glossary Term"
        primaryAction={{
          content: "Add Term",
          onAction: handleAddGlossary,
          disabled:
            !glossaryForm.sourceText ||
            !glossaryForm.targetText ||
            !glossaryForm.sourceLanguage ||
            !glossaryForm.targetLanguage,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setGlossaryModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Source Text"
              value={glossaryForm.sourceText}
              onChange={(value) =>
                setGlossaryForm({ ...glossaryForm, sourceText: value })
              }
              autoComplete="off"
              placeholder="e.g., Product Name"
            />

            <TextField
              label="Target Text"
              value={glossaryForm.targetText}
              onChange={(value) =>
                setGlossaryForm({ ...glossaryForm, targetText: value })
              }
              autoComplete="off"
              placeholder="e.g., Nom du Produit"
            />

            <Select
              label="Source Language"
              options={[
                { label: "Select source language...", value: "" },
                ...data.shopLanguages.map((sl) => ({
                  label: `${sl.language.name} (${sl.language.code})`,
                  value: sl.language.code,
                })),
              ]}
              value={glossaryForm.sourceLanguage}
              onChange={(value) =>
                setGlossaryForm({ ...glossaryForm, sourceLanguage: value })
              }
            />

            <Select
              label="Target Language"
              options={[
                { label: "Select target language...", value: "" },
                ...data.shopLanguages.map((sl) => ({
                  label: `${sl.language.name} (${sl.language.code})`,
                  value: sl.language.code,
                })),
              ]}
              value={glossaryForm.targetLanguage}
              onChange={(value) =>
                setGlossaryForm({ ...glossaryForm, targetLanguage: value })
              }
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
