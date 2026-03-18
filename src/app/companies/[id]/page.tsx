"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Company } from "@/lib/domain/types";

export default function CompanyProfilePage() {
  const { locale } = useLocale();
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    void (async () => {
      const response = await fetch(`/api/vendors/companies/${id}`);
      const payload = (await response.json().catch(() => ({}))) as { company?: Company; error?: string };
      if (!response.ok || !payload.company) {
        setError(payload.error ?? (locale === "ja" ? "会社情報を読み込めませんでした。" : "Failed to load company information."));
        return;
      }
      setCompany(payload.company);
    })();
  }, [locale, params]);

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

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {company ? (
            <>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{company.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{company.country}</p>
                <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${company.plan === "translation" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {company.plan === "translation" ? (locale === "ja" ? "翻訳付きプラン" : "Translation Plan") : (locale === "ja" ? "ベーシックプラン" : "Basic Plan")}
                </p>
              </div>
              <p className="text-sm leading-7 text-slate-700">{company.summary}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                  <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "公開連絡先" : "Public Contact"}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "メール" : "Email"}: {company.publicContactEmail ?? (locale === "ja" ? "未設定" : "Not set")}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "電話" : "Phone"}: {company.publicContactPhone ?? (locale === "ja" ? "未設定" : "Not set")}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Website:{" "}
                    {company.websiteUrl ? (
                      <a className="font-semibold text-blue-700 underline" href={company.websiteUrl} target="_blank" rel="noreferrer">
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
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "単価目安" : "Rate range"}: ${company.minRate}-${company.maxRate}/h</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "英語" : "English"}: {company.english} / {locale === "ja" ? "日本語" : "Japanese"}: {company.japaneseSupport}</p>
                  <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "チャット言語" : "Chat language"}: {company.preferredLanguage ?? "en"}</p>
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
                        <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                        <Badge>{project.projectType}</Badge>
                      </div>
                      <p className="text-sm leading-7 text-slate-700">{project.summary}</p>
                      <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-3">
                        <p>{locale === "ja" ? "期間" : "Timeline"}: <span className="font-semibold text-slate-900">{project.durationLabel}</span></p>
                        <p>{locale === "ja" ? "予算目安" : "Budget"}: <span className="font-semibold text-slate-900">{project.budgetLabel}</span></p>
                        <p>{locale === "ja" ? "成果" : "Impact"}: <span className="font-semibold text-slate-900">{project.businessImpact}</span></p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.technologies.map((tech) => (
                          <Badge key={`${project.id}-${tech}`}>{tech}</Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                  {company.portfolioProjects.length === 0 ? <p className="text-sm text-slate-600">{locale === "ja" ? "まだ公開実績は登録されていません。" : "No public portfolio items have been added yet."}</p> : null}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">{locale === "ja" ? "読み込み中..." : "Loading..."}</p>
          )}
        </Card>
      </main>
    </div>
  );
}
