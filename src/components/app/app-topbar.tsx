"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

type AppTopbarProps = {
  title: string;
  subtitle?: string;
};

export function AppTopbar({ title, subtitle }: AppTopbarProps) {
  const { locale } = useLocale();
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
            OffshoreMatch
          </Link>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {locale === "ja" ? "ホーム" : "Home"}
          </Link>
        </div>
      </div>
    </header>
  );
}
