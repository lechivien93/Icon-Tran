import { useState, useEffect, useRef } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Badge,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import { ChatIcon, SendIcon } from "@shopify/polaris-icons";
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
    },
  });

  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  // Get latest conversation or create new
  let conversation = await prisma.chatConversation.findFirst({
    where: {
      shopId: shop.id,
      isActive: true,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        shopId: shop.id,
        title: "New Conversation",
      },
      include: {
        messages: true,
      },
    });
  }

  return {
    shop,
    conversation,
    tokenBalance: shop.tokenWallet?.balance || 0,
  };
};

export default function ChatPage() {
  const { conversation, tokenBalance } = useLoaderData<typeof loader>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(conversation.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFetcher = useFetcher();

  const isLoading = chatFetcher.state === "submitting";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update messages when fetcher returns
  useEffect(() => {
    if (chatFetcher.data && chatFetcher.data.response) {
      setMessages((prev) => [
        ...prev,
        {
          id: chatFetcher.data.messageId,
          role: "ASSISTANT",
          content: chatFetcher.data.response,
          createdAt: new Date().toISOString(),
          conversationId: conversation.id,
          intent: chatFetcher.data.intent?.action || null,
          intentConfidence: chatFetcher.data.intent?.confidence || null,
          extractedParams: chatFetcher.data.intent?.params || null,
          actionExecuted: chatFetcher.data.actionExecuted?.name || null,
          actionResult: chatFetcher.data.actionExecuted?.result || null,
        },
      ]);
    }
  }, [chatFetcher.data, conversation.id]);

  const handleSendMessage = () => {
    if (!message.trim() || isLoading) return;

    // Add user message immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: "USER" as const,
      content: message,
      createdAt: new Date().toISOString(),
      conversationId: conversation.id,
      intent: null,
      intentConfidence: null,
      extractedParams: null,
      actionExecuted: null,
      actionResult: null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    // Send to API
    chatFetcher.submit(
      {
        message,
        conversationId: conversation.id,
      },
      {
        method: "POST",
        action: "/api/chat",
        encType: "application/json",
      },
    );
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Page
      title="AI Assistant"
      subtitle="Chat with your translation assistant"
      secondaryActions={[
        {
          content: `${tokenBalance} Tokens`,
          icon: ChatIcon,
          disabled: true,
        },
      ]}
    >
      <BlockStack gap="400">
        {/* Welcome Banner */}
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              👋 Welcome to IconTran AI Assistant
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              I can help you translate products, sync data, manage settings, and
              more. Just ask me in natural language!
            </Text>
            <Divider />
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Example commands:
            </Text>
            <Box as="ul" paddingInlineStart="400">
              <li>
                <Text as="span" variant="bodyMd">
                  &quot;Sync all products from Shopify&quot;
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodyMd">
                  &quot;Translate collection &apos;Summer 2026&apos; to French
                  using OpenAI&quot;
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodyMd">
                  &quot;Enable auto-translate for Spanish&quot;
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodyMd">
                  &quot;Show me translation progress&quot;
                </Text>
              </li>
            </Box>
          </BlockStack>
        </Card>

        {/* Chat Messages */}
        <Card>
          <BlockStack gap="400">
            <Box
              background="bg-surface-secondary"
              padding="400"
              borderRadius="200"
              minHeight="500px"
              maxHeight="600px"
              style={{ overflowY: "auto" }}
            >
              <BlockStack gap="300">
                {messages.length === 0 ? (
                  <EmptyState
                    heading="Start a conversation"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <Text as="p" variant="bodyMd">
                      Ask me anything about your translations, sync, or
                      settings!
                    </Text>
                  </EmptyState>
                ) : (
                  messages.map((msg) => (
                    <Box
                      key={msg.id}
                      background={
                        msg.role === "USER" ? "bg-fill-info" : "bg-surface"
                      }
                      padding="300"
                      borderRadius="200"
                    >
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Badge
                            tone={msg.role === "USER" ? "info" : "success"}
                          >
                            {msg.role === "USER" ? "You" : "AI Assistant"}
                          </Badge>
                          {msg.intent && (
                            <Badge tone="attention">
                              {msg.intent.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          {msg.content}
                        </Text>
                        {msg.actionExecuted && (
                          <Box
                            background="bg-fill-success-secondary"
                            padding="200"
                            borderRadius="100"
                          >
                            <Text as="p" variant="bodySm" tone="success">
                              ✓ Action executed: {msg.actionExecuted}
                            </Text>
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  ))
                )}

                {isLoading && (
                  <Box background="bg-surface" padding="300" borderRadius="200">
                    <InlineStack gap="200" align="start">
                      <Spinner size="small" />
                      <Text as="p" variant="bodyMd" tone="subdued">
                        AI is thinking...
                      </Text>
                    </InlineStack>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </BlockStack>
            </Box>

            {/* Input Area */}
            <InlineStack gap="200" align="end">
              <Box width="100%">
                <TextField
                  label="Message"
                  labelHidden
                  value={message}
                  onChange={setMessage}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send)"
                  autoComplete="off"
                  multiline={3}
                  disabled={isLoading}
                />
              </Box>
              <Button
                icon={SendIcon}
                variant="primary"
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                loading={isLoading}
              >
                Send
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              Quick Actions
            </Text>
            <InlineStack gap="200" wrap>
              <Button
                onClick={() => {
                  setMessage("Sync all products");
                  handleSendMessage();
                }}
                disabled={isLoading}
              >
                Sync Products
              </Button>
              <Button
                onClick={() => {
                  setMessage("Sync collections");
                  handleSendMessage();
                }}
                disabled={isLoading}
              >
                Sync Collections
              </Button>
              <Button
                onClick={() => {
                  setMessage("Show translation progress");
                  handleSendMessage();
                }}
                disabled={isLoading}
              >
                View Progress
              </Button>
              <Button
                onClick={() => {
                  setMessage("How many tokens do I have?");
                  handleSendMessage();
                }}
                disabled={isLoading}
              >
                Check Balance
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
