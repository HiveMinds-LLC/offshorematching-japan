"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

type AppTopbarProps = {
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  stats?: Array<{
    label: string;
    labelEn?: string;
    value: number;
  }>;
};

export function AppTopbar({ title, titleEn, subtitle, subtitleEn }: AppTopbarProps) {
  const { locale } = useLocale();
  const resolvedTitle = locale === "ja" ? title : (titleEn ?? title);
  const resolvedSubtitle = locale === "ja" ? subtitle : (subtitleEn ?? subtitle);
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
            offshoredevelopment.com
          </Link>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
            {resolvedTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {locale === "ja" ? "ホーム" : "Home"}
          </Link>
        </div>
      </div>
      {resolvedSubtitle ? (
        <div className="mx-auto w-full max-w-7xl px-4 pb-3">
          <p className="text-xs text-slate-500">{resolvedSubtitle}</p>
        </div>
      ) : null}
    </header>
  );
}
