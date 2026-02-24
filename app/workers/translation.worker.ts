import { Job } from "bull";
import translationQueue, {
  type TranslationJobData,
} from "~/queues/translation.queue";
import translationService from "~/services/translation.service";
import prisma from "~/db.server";
import type { TranslationEngine } from "@prisma/client";

/**
 * Translation Queue Worker
 * Processes translation jobs for resources
 */
translationQueue.process(async (job: Job<TranslationJobData>) => {
  const { jobId, shopId, resourceId, targetLanguageCodes, engine } = job.data;

  console.log(
    `🌐 Processing translation job ${job.id}: Resource ${resourceId} to ${targetLanguageCodes.join(", ")}`,
  );

  try {
    // Get translation job
    const translationJob = await prisma.translationJob.findUnique({
      where: { id: jobId },
      include: {
        resource: {
          include: {
            fields: true,
          },
        },
      },
    });

    if (!translationJob) {
      throw new Error(`Translation job ${jobId} not found`);
    }

    // Update job status
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    const { resource } = translationJob;
    const totalFields = resource.fields.length * targetLanguageCodes.length;
    let processedFields = 0;
    let failedFields = 0;

    // Get shop's glossary rules
    const glossaryRules = await prisma.glossary.findMany({
      where: {
        shopId,
        isActive: true,
      },
    });

    const glossaryData = glossaryRules.map((rule) => ({
      term: rule.term,
      translation: rule.translation || undefined,
      rule: rule.rule as "DO_NOT_TRANSLATE" | "CUSTOM_TRANSLATION",
      caseSensitive: rule.caseSensitive,
    }));

    // Get languages
    const languages = await prisma.language.findMany({
      where: {
        code: {
          in: targetLanguageCodes,
        },
      },
    });

    // Process each field for each language
    for (const field of resource.fields) {
      for (const targetLangCode of targetLanguageCodes) {
        try {
          const language = languages.find((l) => l.code === targetLangCode);
          if (!language) {
            console.warn(`Language ${targetLangCode} not found, skipping`);
            failedFields++;
            continue;
          }

          // Check if translation already exists
          const existingTranslation = await prisma.translation.findUnique({
            where: {
              resourceId_fieldId_languageId: {
                resourceId: resource.id,
                fieldId: field.id,
                languageId: language.id,
              },
            },
          });

          // Skip if already translated and not manual edit
          if (
            existingTranslation &&
            existingTranslation.status === "COMPLETED" &&
            !existingTranslation.needsReview
          ) {
            processedFields++;
            continue;
          }

          // Translate
          const translateResult = await translationService.translate({
            text: field.originalValue,
            targetLanguage: targetLangCode,
            engine: engine as TranslationEngine,
            glossaryRules: glossaryData,
          });

          // Deduct tokens if needed (OpenAI/Gemini)
          if (
            translateResult.tokensUsed > 0 &&
            (engine === "OPENAI" || engine === "GEMINI")
          ) {
            await translationService.deductTokens(
              shopId,
              translateResult.tokensUsed,
              {
                engine: engine as "OPENAI" | "GEMINI",
                resourceType: resource.type,
                resourceId: resource.id,
              },
            );
          }

          // Save translation
          await prisma.translation.upsert({
            where: {
              resourceId_fieldId_languageId: {
                resourceId: resource.id,
                fieldId: field.id,
                languageId: language.id,
              },
            },
            create: {
              resourceId: resource.id,
              fieldId: field.id,
              languageId: language.id,
              translatedValue: translateResult.translatedText,
              engine: engine as TranslationEngine,
              status: "COMPLETED",
              tokensUsed: translateResult.tokensUsed,
            },
            update: {
              translatedValue: translateResult.translatedText,
              engine: engine as TranslationEngine,
              status: "COMPLETED",
              tokensUsed: translateResult.tokensUsed,
              isManualEdit: false,
            },
          });

          processedFields++;

          // Update progress
          const progress = Math.floor((processedFields / totalFields) * 100);
          await job.progress(progress);

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(
            `Failed to translate field ${field.fieldName} to ${targetLangCode}:`,
            error,
          );
          failedFields++;
        }
      }
    }

    // Update job completion
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: failedFields === 0 ? "COMPLETED" : "FAILED",
        totalFields,
        processedFields,
        failedFields,
        completedAt: new Date(),
      },
    });

    // Update resource translation status
    const translatedCount = await prisma.translation.count({
      where: {
        resourceId: resource.id,
        status: "COMPLETED",
      },
    });

    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        translationStatus:
          translatedCount === totalFields ? "COMPLETED" : "PARTIALLY_COMPLETED",
        translatedCount,
        totalLanguages: targetLanguageCodes.length,
      },
    });

    console.log(
      `✅ Translation job ${job.id} completed: ${processedFields}/${totalFields} fields`,
    );

    return {
      success: true,
      jobId,
      processedFields,
      failedFields,
    };
  } catch (error) {
    console.error(`❌ Translation job ${job.id} failed:`, error);

    // Update job as failed
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
});

console.log("🚀 Translation queue worker started");

export default translationQueue;
