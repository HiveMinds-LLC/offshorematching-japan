"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export function SiteFooter() {
  const { locale } = useLocale();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/70">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 md:grid-cols-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg font-extrabold">offshoredevelopment.com</p>
          <p className="mt-2 text-sm text-slate-600">{locale === "ja" ? "日本企業向けオフショア開発プラットフォーム" : "Offshore development platform for Japanese companies"}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{locale === "ja" ? "メニュー" : "Menu"}</p>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            <Link href="/">{locale === "ja" ? "ホーム" : "Home"}</Link>
            <Link href="/pricing">{locale === "ja" ? "料金" : "Pricing"}</Link>
            <Link href="/hacchuu-kigyou-muke">{locale === "ja" ? "発注企業向け" : "For Buyers"}</Link>
            <Link href="/kaihatsu-kaisha-muke">{locale === "ja" ? "開発会社向け" : "For Vendors"}</Link>
            <Link href="/app">{locale === "ja" ? "アプリ" : "App"}</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{locale === "ja" ? "法務情報" : "Legal"}</p>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            <Link href="/legal/terms">{locale === "ja" ? "利用規約" : "Terms of Service"}</Link>
            <Link href="/legal/privacy">{locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}</Link>
            <Link href="/legal/commercial-transactions">{locale === "ja" ? "特定商取引法に基づく表記" : "Commercial Transactions"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
