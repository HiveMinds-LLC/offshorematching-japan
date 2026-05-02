"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import type { BuyerOrganization } from "@/lib/domain/types";
import type { Company } from "@/lib/domain/types";

type CompanyProfilePageClientProps = {
  initialCompany: Company;
  initialSessionRole: "guest" | "buyer" | "vendor" | "admin";
  initialBuyer: BuyerOrganization | null;
  initialFavoriteCompanyIds: string[];
};

function normalizeExternalUrl(url?: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function levelLabel(value: Company["english"], locale: "ja" | "en") {
  if (locale === "ja") {
    if (value === "native") return "ネイティブ";
    if (value === "high") return "上級";
    if (value === "medium") return "中級";
    return "初級";
  }
  if (value === "native") return "Native";
  if (value === "high") return "Advanced";
  if (value === "medium") return "Intermediate";
  return "Beginner";
}

function languageLabel(language: Company["preferredLanguage"], locale: "ja" | "en") {
  switch (language) {
    case "ja": return locale === "ja" ? "日本語" : "Japanese";
    case "vi": return locale === "ja" ? "ベトナム語" : "Vietnamese";
    case "id": return locale === "ja" ? "インドネシア語" : "Indonesian";
    case "th": return locale === "ja" ? "タイ語" : "Thai";
    case "pl": return locale === "ja" ? "ポーランド語" : "Polish";
    case "ro": return locale === "ja" ? "ルーマニア語" : "Romanian";
    case "ko": return locale === "ja" ? "韓国語" : "Korean";
    case "hi": return locale === "ja" ? "ヒンディー語" : "Hindi";
    case "uk": return locale === "ja" ? "ウクライナ語" : "Ukrainian";
    case "et": return locale === "ja" ? "エストニア語" : "Estonian";
    case "es": return locale === "ja" ? "スペイン語" : "Spanish";
    case "ms": return locale === "ja" ? "マレー語" : "Malay";
    case "tl": return locale === "ja" ? "タガログ語" : "Tagalog";
    case "en":
    default:
      return locale === "ja" ? "英語" : "English";
  }
}

const COUNTRY_LABELS: Record<string, { ja: string; en: string }> = {
  germany: { ja: "ドイツ", en: "Germany" },
  japan: { ja: "日本", en: "Japan" },
  vietnam: { ja: "ベトナム", en: "Vietnam" },
  indonesia: { ja: "インドネシア", en: "Indonesia" },
  thailand: { ja: "タイ", en: "Thailand" },
  poland: { ja: "ポーランド", en: "Poland" },
  romania: { ja: "ルーマニア", en: "Romania" },
  "south korea": { ja: "韓国", en: "South Korea" },
  korea: { ja: "韓国", en: "Korea" },
  india: { ja: "インド", en: "India" },
  ukraine: { ja: "ウクライナ", en: "Ukraine" },
  estonia: { ja: "エストニア", en: "Estonia" },
  spain: { ja: "スペイン", en: "Spain" },
  malaysia: { ja: "マレーシア", en: "Malaysia" },
  philippines: { ja: "フィリピン", en: "Philippines" },
  "united states": { ja: "アメリカ", en: "United States" },
  usa: { ja: "アメリカ", en: "USA" },
  singapore: { ja: "シンガポール", en: "Singapore" },
  taiwan: { ja: "台湾", en: "Taiwan" },
  china: { ja: "中国", en: "China" },
  france: { ja: "フランス", en: "France" },
  "united kingdom": { ja: "イギリス", en: "United Kingdom" },
  uk: { ja: "イギリス", en: "UK" },
  canada: { ja: "カナダ", en: "Canada" },
  australia: { ja: "オーストラリア", en: "Australia" }
};

function countryLabel(country: string | undefined, locale: "ja" | "en") {
  const trimmed = country?.trim() ?? "";
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  const mapped = COUNTRY_LABELS[normalized];
  if (mapped) return locale === "ja" ? mapped.ja : mapped.en;
  return trimmed;
}

function formatYenRateRange(minRate: number, maxRate: number, locale: "ja" | "en") {
  const min = `¥${minRate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  const max = `¥${maxRate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  return `${min}-${max}/${locale === "ja" ? "時" : "hr"}`;
}

function companySummaryForLocale(company: Company, locale: "ja" | "en") {
  return locale === "ja" ? company.summaryJa?.trim() || company.summary : company.summary;
}

function portfolioTitleForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? project.titleJa?.trim() || project.title : project.title;
}

function portfolioSummaryForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? project.summaryJa?.trim() || project.summary : project.summary;
}

function portfolioDurationForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? project.durationLabelJa?.trim() || project.durationLabel : project.durationLabel;
}

function portfolioBudgetForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? project.budgetLabelJa?.trim() || project.budgetLabel : project.budgetLabel;
}

function portfolioImpactForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? project.businessImpactJa?.trim() || project.businessImpact : project.businessImpact;
}

function portfolioTechnologiesForLocale(project: Company["portfolioProjects"][number], locale: "ja" | "en") {
  return locale === "ja" ? (project.technologiesJa?.length ? project.technologiesJa : project.technologies) : project.technologies;
}

export function CompanyProfilePageClient({
  initialCompany,
  initialSessionRole,
  initialBuyer,
  initialFavoriteCompanyIds
}: CompanyProfilePageClientProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [company] = useState<Company>(initialCompany);
  const [sessionRole] = useState<"guest" | "buyer" | "vendor" | "admin">(initialSessionRole);
  const [buyer] = useState<BuyerOrganization | null>(initialBuyer);
  const [favoriteCompanyIds, setFavoriteCompanyIds] = useState<string[]>(initialFavoriteCompanyIds);
  const [threadLoading, setThreadLoading] = useState(false);

  async function toggleFavoriteCompany(companyId: string) {
    const isSaved = favoriteCompanyIds.includes(companyId);
    setFavoriteCompanyIds((prev) =>
      isSaved ? prev.filter((id) => id !== companyId) : [companyId, ...prev]
    );

    const response = await fetch("/api/buyers/saved-companies", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId })
    });
    if (!response.ok) {
      setFavoriteCompanyIds((prev) =>
        isSaved ? [companyId, ...prev] : prev.filter((id) => id !== companyId)
      );
      toast({
        tone: "error",
        title: locale === "ja" ? "保存候補を更新できませんでした" : "Could not update saved vendors"
      });
      return;
    }

    toast({
      tone: "success",
      title:
        isSaved
          ? locale === "ja"
            ? "保存候補から外しました"
            : "Removed from saved vendors"
          : locale === "ja"
            ? "保存候補に追加しました"
            : "Added to saved vendors"
    });
  }

  async function handleStartThread() {
    if (!company || sessionRole !== "buyer" || !buyer) return;
    setThreadLoading(true);
    const response = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorCompanyId: company.id })
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; thread?: { id: string } };
    if (!response.ok) {
      toast({
        tone: "error",
        title: locale === "ja" ? "問い合わせを開始できませんでした" : "Could not start inquiry",
        description: payload.error ?? (locale === "ja" ? "時間をおいて再度お試しください。" : "Please try again.")
      });
      setThreadLoading(false);
      return;
    }
    toast({
      tone: "success",
      title: locale === "ja" ? "問い合わせを開始しました" : "Inquiry started"
    });
    router.push(`/app?section=buyer-messages&thread=${payload.thread?.id ?? ""}`);
    router.refresh();
  }

  return (
    <div>
      <AppTopbar title={locale === "ja" ? "会社プロフィール" : "Company Profile"} subtitle={locale === "ja" ? "公開ページ" : "Public Page"} />
      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="section-title">{locale === "ja" ? "開発会社プロフィール" : "Vendor Profile"}</h1>
            <Link href="/app" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {locale === "ja" ? "マーケットプレイスへ戻る" : "Back to Marketplace"}
            </Link>
          </div>

          <>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{company.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{countryLabel(company.country, locale)}</p>
                <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${company.plan === "translation" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {company.plan === "translation" ? (locale === "ja" ? "翻訳付きプラン" : "Translation Plan") : (locale === "ja" ? "ベーシックプラン" : "Basic Plan")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sessionRole !== "vendor" && sessionRole !== "admin" ? (
                    <Button variant="ghost" onClick={() => toggleFavoriteCompany(company.id)}>
                      {favoriteCompanyIds.includes(company.id)
                        ? locale === "ja"
                          ? "保存解除"
                          : "Remove"
                        : locale === "ja"
                          ? "候補に保存"
                          : "Save"}
                    </Button>
                  ) : null}
                  {sessionRole === "buyer" ? (
                    <Button onClick={() => void handleStartThread()} disabled={threadLoading}>
                      {threadLoading
                        ? locale === "ja"
                          ? "開始中..."
                          : "Starting..."
                        : locale === "ja"
                          ? "問い合わせ開始"
                          : "Start Inquiry"}
                    </Button>
                  ) : null}
                  {sessionRole === "guest" ? (
                    <Link href="/app" className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      {locale === "ja" ? "ログインして問い合わせ" : "Log in to inquire"}
                    </Link>
                  ) : null}
                </div>
              </div>
              <p className="text-sm leading-7 text-slate-700">{companySummaryForLocale(company, locale)}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                  <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "公開連絡先" : "Public Contact"}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "メール" : "Email"}: {company.publicContactEmail ?? (locale === "ja" ? "未設定" : "Not set")}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "電話" : "Phone"}: {company.publicContactPhone ?? (locale === "ja" ? "未設定" : "Not set")}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {locale === "ja" ? "Webサイト" : "Website"}:{" "}
                    {company.websiteUrl ? (
                      <a
                        className="font-semibold text-blue-700 underline underline-offset-2"
                        href={normalizeExternalUrl(company.websiteUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {company.websiteUrl}
                      </a>
                    ) : (
                      locale === "ja" ? "未設定" : "Not set"
                    )}
                  </p>
                </Card>
                <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                  <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "開発体制" : "Delivery Setup"}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "人数" : "Team size"}: {company.teamSize}{locale === "ja" ? "名" : ""}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "単価目安" : "Rate range"}: {formatYenRateRange(company.minRate, company.maxRate, locale)}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {locale === "ja" ? "英語" : "English"}: {levelLabel(company.english, locale)} / {locale === "ja" ? "日本語" : "Japanese"}: {levelLabel(company.japaneseSupport, locale)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "会社言語" : "Company language"}: {languageLabel(company.preferredLanguage, locale)}</p>
                </Card>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {company.services.map((service) => (
                  <Badge key={service}>{service}</Badge>
                ))}
              </div>

              <div className="grid gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{locale === "ja" ? "ポートフォリオ実績" : "Portfolio"}</h3>
                  <p className="mt-1 text-sm text-slate-600">{locale === "ja" ? "どのような種類の案件を担当してきたかを、非技術者でも把握しやすい形で掲載しています。" : "Examples of past work presented in a way that is easy for non-technical buyers to understand."}</p>
                </div>
                <div className="grid gap-3">
                  {company.portfolioProjects.map((project) => (
                    <Card key={project.id} className="grid gap-3 border-slate-100 bg-slate-50 p-4 shadow-none">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{portfolioTitleForLocale(project, locale)}</p>
                        <Badge>{project.projectType}</Badge>
                      </div>
                      <p className="text-sm leading-7 text-slate-700">{portfolioSummaryForLocale(project, locale)}</p>
                      <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-3">
                        <p>{locale === "ja" ? "期間" : "Timeline"}: <span className="font-semibold text-slate-900">{portfolioDurationForLocale(project, locale)}</span></p>
                        <p>{locale === "ja" ? "予算目安" : "Budget"}: <span className="font-semibold text-slate-900">{portfolioBudgetForLocale(project, locale)}</span></p>
                        <p>{locale === "ja" ? "成果" : "Impact"}: <span className="font-semibold text-slate-900">{portfolioImpactForLocale(project, locale)}</span></p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {portfolioTechnologiesForLocale(project, locale).map((tech) => (
                          <Badge key={`${project.id}-${tech}`}>{tech}</Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                  {company.portfolioProjects.length === 0 ? <p className="text-sm text-slate-600">{locale === "ja" ? "まだ公開実績は登録されていません。" : "No public portfolio items have been added yet."}</p> : null}
                </div>
              </div>

              {company.completedEngagements && company.completedEngagements.length > 0 ? (
                <div className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{locale === "ja" ? "完了案件" : "Completed Engagements"}</h3>
                    <p className="mt-1 text-sm text-slate-600">{locale === "ja" ? "platform上で完了した案件履歴です。" : "Engagements completed through the platform."}</p>
                  </div>
                  <div className="grid gap-3">
                    {company.completedEngagements.map((project) => (
                      <Card key={project.id} className="grid gap-2 border-slate-100 bg-slate-50 p-4 shadow-none">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                          <Badge className="bg-emerald-50 text-emerald-700">{locale === "ja" ? "完了" : "Completed"}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{project.summary}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {new Date(project.completedAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
          </>
        </Card>
      </main>
    </div>
  );
}
