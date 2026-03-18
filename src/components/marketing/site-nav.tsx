"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

export function SiteNav() {
  const { locale } = useLocale();
  const navItems = [
    { href: "/", label: locale === "ja" ? "ホーム" : "Home" },
    { href: "/pricing", label: locale === "ja" ? "料金" : "Pricing" },
    { href: "/hacchuu-kigyou-muke", label: locale === "ja" ? "発注企業向け" : "For Buyers" },
    { href: "/kaihatsu-kaisha-muke", label: locale === "ja" ? "開発会社向け" : "For Vendors" }
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
          OffshoreMatch
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/pricing" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
            {locale === "ja" ? "料金を見る" : "View Pricing"}
          </Link>
          <Link href="/app" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            {locale === "ja" ? "アプリ" : "App"}
          </Link>
        </div>
      </div>
    </header>
  );
}
