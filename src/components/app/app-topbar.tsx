"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const resolvedTitle = locale === "ja" ? title : (titleEn ?? title);
  const resolvedSubtitle = locale === "ja" ? subtitle : (subtitleEn ?? subtitle);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("offshoredevelopment.app-theme");
    const nextTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(nextTheme);
    document.body.classList.toggle("app-theme-dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("offshoredevelopment.app-theme", nextTheme);
    document.body.classList.toggle("app-theme-dark", nextTheme === "dark");
  }

  return (
    <header data-site-nav className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white p-1 shadow-sm">
              <Image src="/icon.png" alt="" width={24} height={24} className="h-full w-full object-contain" priority />
            </span>
            <span>offshoredevelopment.com</span>
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
