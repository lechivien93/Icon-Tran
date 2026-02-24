import { BaseService } from "./base.service";
import type { ChatPromptRequest, ChatPromptResponse } from "~/types/app.types";
import type { ChatIntent } from "@prisma/client";
import { OpenAI } from "openai";
import syncService from "./sync.service";

interface IntentResult {
  intent: ChatIntent;
  confidence: number;
  params: Record<string, unknown>;
}

export class LLMRouterService extends BaseService {
  private openai: OpenAI;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }

  /**
   * Process chat prompt and execute action
   */
  async processPrompt(request: ChatPromptRequest): Promise<ChatPromptResponse> {
    this.log("info", `Processing chat prompt for shop ${request.shopId}`);

    // Get or create conversation
    let conversationId = request.conversationId;
    if (!conversationId) {
      const conversation = await this.db.chatConversation.create({
        data: {
          shopId: request.shopId,
          title: this.generateConversationTitle(request.message),
        },
      });
      conversationId = conversation.id;
    }

    // Save user message
    const userMessage = await this.db.chatMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: request.message,
      },
    });

    // Detect intent using OpenAI Function Calling
    const intentResult = await this.detectIntent(request.message);

    // Update user message with intent
    await this.db.chatMessage.update({
      where: { id: userMessage.id },
      data: {
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        extractedParams: intentResult.params,
      },
    });

    // Execute action based on intent
    let actionResult: unknown = null;
    let responseText = "";

    try {
      switch (intentResult.intent) {
        case "SYNC_RESOURCES":
          actionResult = await this.handleSyncResources(
            request.shopId,
            intentResult.params,
          );
          responseText = this.generateSyncResponse(actionResult);
          break;

        case "TRANSLATE_RESOURCES":
          responseText = "Translation feature coming soon!";
          break;

        case "MANAGE_GLOSSARY":
          responseText = "Glossary management feature coming soon!";
          break;

        case "MANAGE_BILLING":
          responseText = "Billing management feature coming soon!";
          break;

        case "VIEW_REPORT":
          responseText = "Report generation feature coming soon!";
          break;

        case "GENERAL_QUESTION":
          responseText = await this.handleGeneralQuestion(request.message);
          break;

        default:
          responseText =
            "I'm sorry, I didn't understand that. Can you please rephrase?";
      }
    } catch (error) {
      this.log("error", "Error executing action", error);
      responseText = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }

    // Save assistant response
    const assistantMessage = await this.db.chatMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: responseText,
        actionExecuted: intentResult.intent,
        actionResult: actionResult as never,
      },
    });

    return {
      conversationId,
      messageId: assistantMessage.id,
      response: responseText,
      intent: {
        action: intentResult.intent,
        confidence: intentResult.confidence,
        params: intentResult.params,
      },
      actionExecuted: actionResult
        ? { name: intentResult.intent, result: actionResult }
        : undefined,
    };
  }

  /**
   * Detect intent using OpenAI Function Calling
   */
  private async detectIntent(message: string): Promise<IntentResult> {
    const functions = [
      {
        name: "sync_resources",
        description:
          "Synchronize Shopify resources (products, collections, blogs) to the app database",
        parameters: {
          type: "object",
          properties: {
            resourceType: {
              type: "string",
              enum: ["product", "collection", "blog", "page"],
              description: "Type of resource to sync",
            },
            filters: {
              type: "object",
              properties: {
                handle: { type: "string" },
                updatedAfter: { type: "string" },
              },
            },
          },
          required: ["resourceType"],
        },
      },
      {
        name: "translate_resources",
        description: "Translate resources to target languages",
        parameters: {
          type: "object",
          properties: {
            resourceType: {
              type: "string",
              enum: ["product", "collection", "blog", "page"],
            },
            targetLanguages: {
              type: "array",
              items: { type: "string" },
              description: "Language codes (e.g., ['fr', 'ja', 'es'])",
            },
            engine: {
              type: "string",
              enum: ["google", "openai", "gemini"],
              description: "Translation engine to use",
            },
            filters: {
              type: "object",
              properties: {
                handle: { type: "string" },
                ids: { type: "array", items: { type: "string" } },
              },
            },
          },
          required: ["targetLanguages", "engine"],
        },
      },
    ];

    const completion = await this.openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant for a Shopify translation app. Analyze user requests and determine the appropriate action.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      functions: functions as never,
      function_call: "auto",
    });

    const functionCall = completion.choices[0]?.message?.function_call;

    if (functionCall) {
      const params = JSON.parse(functionCall.arguments || "{}");

      if (functionCall.name === "sync_resources") {
        return {
          intent: "SYNC_RESOURCES",
          confidence: 0.95,
          params,
        };
      } else if (functionCall.name === "translate_resources") {
        return {
          intent: "TRANSLATE_RESOURCES",
          confidence: 0.95,
          params,
        };
      }
    }

    // Fallback to general question
    return {
      intent: "GENERAL_QUESTION",
      confidence: 0.5,
      params: {},
    };
  }

  /**
   * Handle sync resources action
   */
  private async handleSyncResources(
    shopId: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const resourceType = (params.resourceType as string)?.toUpperCase();

    const result = await syncService.syncResources({
      shopId,
      resourceType: resourceType as never,
      filters: params.filters as never,
    });

    return result;
  }

  /**
   * Handle general questions
   */
  private async handleGeneralQuestion(message: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for a Shopify translation app. Provide concise and helpful answers.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0]?.message?.content ||
      "I'm not sure how to answer that."
    );
  }

  /**
   * Generate sync response
   */
  private generateSyncResponse(_result: unknown): string {
    return `✅ Sync initiated successfully! I'm pulling the latest data from your Shopify store. This may take a few moments.`;
  }

  /**
   * Generate conversation title from first message
   */
  private generateConversationTitle(message: string): string {
    return message.length > 50 ? message.substring(0, 50) + "..." : message;
  }
}

export default new LLMRouterService();
