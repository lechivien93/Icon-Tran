import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Languages
  console.log("📝 Seeding languages...");
  const languages = [
    { code: "en", name: "English", nativeName: "English", isRTL: false },
    { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", isRTL: false },
    { code: "ja", name: "Japanese", nativeName: "日本語", isRTL: false },
    { code: "fr", name: "French", nativeName: "Français", isRTL: false },
    { code: "es", name: "Spanish", nativeName: "Español", isRTL: false },
    { code: "de", name: "German", nativeName: "Deutsch", isRTL: false },
    { code: "it", name: "Italian", nativeName: "Italiano", isRTL: false },
    { code: "pt", name: "Portuguese", nativeName: "Português", isRTL: false },
    { code: "zh", name: "Chinese", nativeName: "中文", isRTL: false },
    { code: "ko", name: "Korean", nativeName: "한국어", isRTL: false },
    { code: "ar", name: "Arabic", nativeName: "العربية", isRTL: true },
    { code: "th", name: "Thai", nativeName: "ไทย", isRTL: false },
    { code: "nl", name: "Dutch", nativeName: "Nederlands", isRTL: false },
    { code: "pl", name: "Polish", nativeName: "Polski", isRTL: false },
    { code: "ru", name: "Russian", nativeName: "Русский", isRTL: false },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      create: lang,
      update: lang,
    });
  }

  console.log(`✅ Seeded ${languages.length} languages`);

  // Seed Billing Plans
  console.log("💳 Seeding billing plans...");
  const plans = [
    {
      name: "Free",
      price: 0,
      interval: "MONTHLY" as const,
      maxLanguages: 1,
      maxProducts: 50,
      googleTranslations: 5000,
      includesImageTrans: false,
      includesGlossary: false,
      features: JSON.stringify([
        "1 Language",
        "Up to 50 Products",
        "5,000 Google Translations/month",
        "Basic Support",
      ]),
      shopifyPlanName: "Free Plan",
      isActive: true,
    },
    {
      name: "Basic",
      price: 9.99,
      interval: "MONTHLY" as const,
      maxLanguages: 3,
      maxProducts: 500,
      googleTranslations: 50000,
      includesImageTrans: false,
      includesGlossary: true,
      features: JSON.stringify([
        "3 Languages",
        "Up to 500 Products",
        "50,000 Google Translations/month",
        "Glossary Support",
        "Email Support",
      ]),
      shopifyPlanName: "Basic Plan",
      isActive: true,
    },
    {
      name: "Professional",
      price: 29.99,
      interval: "MONTHLY" as const,
      maxLanguages: 10,
      maxProducts: 5000,
      googleTranslations: 200000,
      includesImageTrans: true,
      includesGlossary: true,
      features: JSON.stringify([
        "10 Languages",
        "Up to 5,000 Products",
        "200,000 Google Translations/month",
        "Image Translation",
        "Glossary Support",
        "Auto-Translation",
        "Priority Support",
      ]),
      shopifyPlanName: "Professional Plan",
      isActive: true,
    },
    {
      name: "Enterprise",
      price: 99.99,
      interval: "MONTHLY" as const,
      maxLanguages: 999,
      maxProducts: 999999,
      googleTranslations: 1000000,
      includesImageTrans: true,
      includesGlossary: true,
      features: JSON.stringify([
        "Unlimited Languages",
        "Unlimited Products",
        "1,000,000 Google Translations/month",
        "Image Translation",
        "Advanced Glossary",
        "Auto-Translation",
        "Bulk Operations",
        "Dedicated Support",
        "Custom Integration",
      ]),
      shopifyPlanName: "Enterprise Plan",
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { name: plan.name },
      create: plan,
      update: plan,
    });
  }

  console.log(`✅ Seeded ${plans.length} billing plans`);

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
