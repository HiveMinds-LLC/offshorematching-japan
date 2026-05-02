import { NextResponse } from "next/server";

import type { PortfolioProject, VendorPreferredLanguage } from "@/lib/domain/types";
import { googleTranslateTexts } from "@/lib/server/google-translate";

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
        portfolioProject.businessImpact.trim()
      ].filter(Boolean);
      const translated = await googleTranslateTexts(texts, targetLanguage);
      let cursor = 0;

      return NextResponse.json({
        portfolioProject: {
          ...portfolioProject,
          titleJa: portfolioProject.title.trim() ? translated[cursor++] ?? portfolioProject.title : portfolioProject.title,
          durationLabelJa: portfolioProject.durationLabel.trim() ? translated[cursor++] ?? portfolioProject.durationLabel : portfolioProject.durationLabel,
          budgetLabelJa: portfolioProject.budgetLabel.trim() ? translated[cursor++] ?? portfolioProject.budgetLabel : portfolioProject.budgetLabel,
          summaryJa: portfolioProject.summary.trim() ? translated[cursor++] ?? portfolioProject.summary : portfolioProject.summary,
          technologiesJa: portfolioProject.technologies.map((item) => item.trim()).filter(Boolean),
          businessImpactJa: portfolioProject.businessImpact.trim() ? translated[cursor++] ?? portfolioProject.businessImpact : portfolioProject.businessImpact
        }
      });
    }

    const translated = await googleTranslateTexts([summary], targetLanguage);
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
