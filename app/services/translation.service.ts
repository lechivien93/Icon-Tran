import { BaseService } from "./base.service";
import {
  ValidationError,
  InsufficientTokensError,
} from "~/types/service.types";
import type {
  TranslateRequest,
  TranslateResponse,
  GlossaryRuleData,
} from "~/types/app.types";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Translate } from "@google-cloud/translate/build/src/v2";

export class TranslationService extends BaseService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private googleTranslate: Translate | null = null;

  constructor() {
    super();
    this.initializeClients();
  }

  private initializeClients(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Gemini
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    // Google Translate
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      this.googleTranslate = new Translate({
        key: process.env.GOOGLE_TRANSLATE_API_KEY,
      });
    }
  }

  /**
   * Translate text using specified engine
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    this.log(
      "info",
      `Translating text to ${request.targetLanguage} using ${request.engine}`,
    );

    // Apply glossary rules before translation
    let processedText = request.text;
    if (request.glossaryRules && request.glossaryRules.length > 0) {
      processedText = this.applyGlossaryRules(
        processedText,
        request.glossaryRules,
      );
    }

    let translatedText: string;
    let tokensUsed = 0;

    switch (request.engine) {
      case "GOOGLE": {
        translatedText = await this.translateWithGoogle(
          processedText,
          request.targetLanguage,
          request.sourceLanguage,
        );
        break;
      }

      case "OPENAI": {
        const openaiResult = await this.translateWithOpenAI(
          processedText,
          request.targetLanguage,
          request.sourceLanguage,
        );
        translatedText = openaiResult.text;
        tokensUsed = openaiResult.tokens;
        break;
      }

      case "GEMINI": {
        const geminiResult = await this.translateWithGemini(
          processedText,
          request.targetLanguage,
          request.sourceLanguage,
        );
        translatedText = geminiResult.text;
        tokensUsed = geminiResult.tokens;
        break;
      }

      default:
        throw new ValidationError(
          `Unsupported translation engine: ${request.engine}`,
        );
    }

    return {
      translatedText,
      engine: request.engine,
      tokensUsed,
      sourceLanguage: request.sourceLanguage || "auto",
      targetLanguage: request.targetLanguage,
    };
  }

  /**
   * Translate with Google Translate
   */
  private async translateWithGoogle(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<string> {
    if (!this.googleTranslate) {
      throw new ValidationError("Google Translate API is not configured");
    }

    const [translation] = await this.googleTranslate.translate(text, {
      from: sourceLanguage,
      to: targetLanguage,
    });

    return translation;
  }

  /**
   * Translate with OpenAI
   */
  private async translateWithOpenAI(
    text: string,
    targetLanguage: string,
    _sourceLanguage?: string,
  ): Promise<{ text: string; tokens: number }> {
    if (!this.openai) {
      throw new ValidationError("OpenAI API is not configured");
    }

    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLanguage}. Preserve HTML tags, formatting, and maintain the original tone and style. Only output the translated text without any explanations.`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    const translatedText = completion.choices[0]?.message?.content || text;
    const tokens = completion.usage?.total_tokens || 0;

    return { text: translatedText, tokens };
  }

  /**
   * Translate with Gemini
   */
  private async translateWithGemini(
    text: string,
    targetLanguage: string,
    _sourceLanguage?: string,
  ): Promise<{ text: string; tokens: number }> {
    if (!this.gemini) {
      throw new ValidationError("Gemini API is not configured");
    }

    const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Translate the following text to ${targetLanguage}. Preserve HTML tags and formatting. Only output the translated text:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();

    // Gemini doesn't provide token counts directly, estimate based on text length
    const tokens = Math.ceil((text.length + translatedText.length) / 4);

    return { text: translatedText, tokens };
  }

  /**
   * Apply glossary rules to text
   */
  private applyGlossaryRules(text: string, rules: GlossaryRuleData[]): string {
    let processedText = text;

    for (const rule of rules) {
      if (rule.rule === "DO_NOT_TRANSLATE") {
        // Mark terms to not translate (implementation depends on engine)
        continue;
      } else if (rule.rule === "CUSTOM_TRANSLATION" && rule.translation) {
        const flags = rule.caseSensitive ? "g" : "gi";
        const regex = new RegExp(rule.term, flags);
        processedText = processedText.replace(regex, rule.translation);
      }
    }

    return processedText;
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if shop has enough tokens for translation
   */
  async checkTokenBalance(
    shopId: string,
    requiredTokens: number,
  ): Promise<boolean> {
    const wallet = await this.db.tokenWallet.findUnique({
      where: { shopId },
    });

    if (!wallet) {
      return false;
    }

    return wallet.balance >= requiredTokens;
  }

  /**
   * Deduct tokens from shop wallet
   */
  async deductTokens(
    shopId: string,
    tokens: number,
    metadata?: {
      engine: "OPENAI" | "GEMINI";
      resourceType?: string;
      resourceId?: string;
    },
  ): Promise<void> {
    const wallet = await this.db.tokenWallet.findUnique({
      where: { shopId },
    });

    if (!wallet) {
      throw new InsufficientTokensError(tokens, 0);
    }

    if (wallet.balance < tokens) {
      throw new InsufficientTokensError(tokens, wallet.balance);
    }

    await this.transaction(async (tx) => {
      // Update wallet
      await tx.tokenWallet.update({
        where: { shopId },
        data: {
          balance: { decrement: tokens },
          totalUsed: { increment: tokens },
        },
      });

      // Record transaction
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          type: "USAGE",
          amount: -tokens,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - tokens,
          engine: metadata?.engine,
          resourceType: metadata?.resourceType as never,
          resourceId: metadata?.resourceId,
          description: `Translation using ${metadata?.engine}`,
        },
      });
    });

    this.log(
      "info",
      `Deducted ${tokens} tokens from shop ${shopId}. New balance: ${wallet.balance - tokens}`,
    );
  }
}

export default new TranslationService();
