"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
          <Image src="/icon.png" alt="" width={26} height={26} className="h-6 w-6 rounded-md" priority />
          <span>offshoredevelopment.com</span>
        </Link>
        <nav className="order-3 hidden w-full items-center gap-6 border-t border-slate-100 pt-3 md:order-none md:flex md:w-auto md:border-0 md:pt-0">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/app" className="rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            {locale === "ja" ? "アプリ" : "App"}
          </Link>
        </div>
      </div>
    </header>
  );
}
