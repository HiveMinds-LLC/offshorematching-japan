"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/app/use-app-theme";
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

export function AppTopbar({ title, titleEn }: AppTopbarProps) {
  const { locale } = useLocale();
  const { theme, toggleTheme } = useAppTheme();
  const resolvedTitle = locale === "ja" ? title : (titleEn ?? title);

  return (
    <header data-site-nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/" className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white p-1 shadow-sm">
              <Image src="/icon.png" alt="" width={24} height={24} className="h-full w-full object-contain" priority />
            </span>
            <span>offshorekaihatsu.com</span>
          </Link>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
            {resolvedTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? (locale === "ja" ? "ライトモードに切り替える" : "Switch to light mode") : (locale === "ja" ? "ダークモードに切り替える" : "Switch to dark mode")}
            title={theme === "dark" ? (locale === "ja" ? "ライトモード" : "Light mode") : (locale === "ja" ? "ダークモード" : "Dark mode")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/" className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {locale === "ja" ? "ホーム" : "Home"}
          </Link>
        </div>
      </div>
    </header>
  );
}
