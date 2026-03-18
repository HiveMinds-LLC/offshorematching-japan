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

  const targetLanguage = String(body.targetLanguage ?? "").trim() as VendorPreferredLanguage;
  const summary = String(body.summary ?? "").trim();
  const portfolioProjects = Array.isArray(body.portfolioProjects) ? (body.portfolioProjects as PortfolioProject[]) : [];

  if (!targetLanguage) {
    return NextResponse.json({ error: "targetLanguage is required." }, { status: 400 });
  }

  const texts = [
    summary,
    ...portfolioProjects.flatMap((project) => [project.title, project.summary, project.businessImpact].map((value) => value.trim()))
  ].filter(Boolean);

  try {
    const translated = await translateTexts(texts, targetLanguage);
    let cursor = 0;

    const nextSummary = summary ? translated[cursor++] ?? summary : summary;
    const nextPortfolioProjects = portfolioProjects.map((project) => {
      const nextTitle = project.title.trim() ? translated[cursor++] ?? project.title : project.title;
      const nextProjectSummary = project.summary.trim() ? translated[cursor++] ?? project.summary : project.summary;
      const nextBusinessImpact = project.businessImpact.trim() ? translated[cursor++] ?? project.businessImpact : project.businessImpact;
      return {
        ...project,
        title: nextTitle,
        summary: nextProjectSummary,
        businessImpact: nextBusinessImpact
      };
    });

    return NextResponse.json({
      summary: nextSummary,
      portfolioProjects: nextPortfolioProjects
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "プロフィール翻訳に失敗しました。" },
      { status: 500 }
    );
  }
}
