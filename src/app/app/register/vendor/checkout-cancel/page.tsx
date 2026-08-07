"use client";

import Link from "next/link";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
import { Card } from "@/components/ui/card";

export default function VendorCheckoutCancelPage() {
  const { locale } = useLocale();
  return (
    <div>
      <AppTopbar title="決済未完了" titleEn="Payment Incomplete" subtitle="掲載準備の続き" subtitleEn="Continue your listing setup" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <h1 className="section-title">{locale === "ja" ? "決済はまだ完了していません" : "Payment was not completed"}</h1>
          <p className="section-subtitle">
            {locale === "ja"
              ? "掲載を開始するには、選択したベンダープランの月額決済完了が必要です。"
              : "To go live, you need to complete the monthly payment for your chosen vendor plan."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/app?section=vendor-billing" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {locale === "ja" ? "請求へ戻る" : "Go to billing"}
            </Link>
            <Link href="/app" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {locale === "ja" ? "アプリへ戻る" : "Back to app"}
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
