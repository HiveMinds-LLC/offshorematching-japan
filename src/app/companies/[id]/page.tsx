"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Company } from "@/lib/domain/types";

export default function CompanyProfilePage() {
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
        setError(payload.error ?? "会社情報を読み込めませんでした。");
        return;
      }
      setCompany(payload.company);
    })();
  }, [params]);

  return (
    <div>
      <AppTopbar title="会社プロフィール" subtitle="公開ページ" />
      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="section-title">開発会社プロフィール</h1>
            <Link href="/app" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              マーケットプレイスへ戻る
            </Link>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {company ? (
            <>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{company.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{company.country}</p>
              </div>
              <p className="text-sm leading-7 text-slate-700">{company.summary}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                  <p className="text-xs font-semibold text-slate-500">公開連絡先</p>
                  <p className="mt-1 text-sm text-slate-700">メール: {company.publicContactEmail ?? "未設定"}</p>
                  <p className="mt-1 text-sm text-slate-700">電話: {company.publicContactPhone ?? "未設定"}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Web:{" "}
                    {company.websiteUrl ? (
                      <a className="font-semibold text-blue-700 underline" href={company.websiteUrl} target="_blank" rel="noreferrer">
                        {company.websiteUrl}
                      </a>
                    ) : (
                      "未設定"
                    )}
                  </p>
                </Card>
                <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                  <p className="text-xs font-semibold text-slate-500">開発体制</p>
                  <p className="mt-1 text-sm text-slate-700">人数: {company.teamSize}名</p>
                  <p className="mt-1 text-sm text-slate-700">単価目安: ${company.minRate}-${company.maxRate}/h</p>
                  <p className="mt-1 text-sm text-slate-700">英語: {company.english} / 日本語: {company.japaneseSupport}</p>
                </Card>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {company.services.map((service) => (
                  <Badge key={service}>{service}</Badge>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">読み込み中...</p>
          )}
        </Card>
      </main>
    </div>
  );
}
