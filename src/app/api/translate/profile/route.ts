import { NextResponse } from "next/server";

import type { PortfolioProject, VendorPreferredLanguage } from "@/lib/domain/types";

type TranslationResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    message?: string;
  };
};

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function translateTexts(texts: string[], target: VendorPreferredLanguage) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY が未設定です。");
  }

  const nonEmptyTexts = texts.map((text) => text.trim()).filter(Boolean);
  if (nonEmptyTexts.length === 0) return [];

  const body = new URLSearchParams();
  body.set("target", target);
  body.set("format", "text");
  body.set("key", apiKey);
  nonEmptyTexts.forEach((text) => body.append("q", text));

  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = (await response.json().catch(() => ({}))) as TranslationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "翻訳APIの呼び出しに失敗しました。");
  }

  return (payload.data?.translations ?? []).map((entry) => decodeHtmlEntities(entry.translatedText ?? ""));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const targetLanguage = (String(body.targetLanguage ?? "ja").trim() || "ja") as VendorPreferredLanguage;
  const summary = String(body.summary ?? "").trim();
  const portfolioProject = body.portfolioProject && typeof body.portfolioProject === "object"
    ? (body.portfolioProject as PortfolioProject)
    : null;

  if (!targetLanguage) {
    return NextResponse.json({ error: "targetLanguage is required." }, { status: 400 });
  }

  if (!summary && !portfolioProject) {
    return NextResponse.json({ error: "summary or portfolioProject is required." }, { status: 400 });
  }

  try {
    if (portfolioProject) {
      const texts = [
        portfolioProject.title.trim(),
        portfolioProject.durationLabel.trim(),
        portfolioProject.budgetLabel.trim(),
        portfolioProject.summary.trim(),
        ...portfolioProject.technologies.map((item) => item.trim()).filter(Boolean),
        portfolioProject.businessImpact.trim()
      ].filter(Boolean);
      const translated = await translateTexts(texts, targetLanguage);
      let cursor = 0;

      return NextResponse.json({
        portfolioProject: {
          ...portfolioProject,
          titleJa: portfolioProject.title.trim() ? translated[cursor++] ?? portfolioProject.title : portfolioProject.title,
          durationLabelJa: portfolioProject.durationLabel.trim() ? translated[cursor++] ?? portfolioProject.durationLabel : portfolioProject.durationLabel,
          budgetLabelJa: portfolioProject.budgetLabel.trim() ? translated[cursor++] ?? portfolioProject.budgetLabel : portfolioProject.budgetLabel,
          summaryJa: portfolioProject.summary.trim() ? translated[cursor++] ?? portfolioProject.summary : portfolioProject.summary,
          technologiesJa: portfolioProject.technologies.map((item) => {
            const trimmed = item.trim();
            return trimmed ? translated[cursor++] ?? trimmed : trimmed;
          }).filter(Boolean),
          businessImpactJa: portfolioProject.businessImpact.trim() ? translated[cursor++] ?? portfolioProject.businessImpact : portfolioProject.businessImpact
        }
      });
    }

    const translated = await translateTexts([summary], targetLanguage);
    const nextSummary = translated[0] ?? summary;

    return NextResponse.json({
      summary: nextSummary
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "プロフィール翻訳に失敗しました。" },
      { status: 500 }
    );
  }
}
