"use client";

import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

export function SiteNav() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const isApp = pathname.startsWith("/app");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!isApp) {
      document.body.classList.remove("app-theme-dark");
      return;
    }

    const savedTheme = window.localStorage.getItem("offshorekaihatsu.app-theme") ?? window.localStorage.getItem("offshoredevelopment.app-theme");
    const nextTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(nextTheme);
    document.body.classList.toggle("app-theme-dark", nextTheme === "dark");
  }, [isApp]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("offshorekaihatsu.app-theme", nextTheme);
    document.body.classList.toggle("app-theme-dark", nextTheme === "dark");
  }
  const navItems = [
    { href: "/", label: locale === "ja" ? "ホーム" : "Home" },
    { href: "/pricing", label: locale === "ja" ? "料金" : "Pricing" },
    { href: "/hacchuu-kigyou-muke", label: locale === "ja" ? "発注企業向け" : "For Buyers" },
    { href: "/kaihatsu-kaisha-muke", label: locale === "ja" ? "開発会社向け" : "For Vendors" }
  ];

  return (
    <header data-site-nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white p-1 shadow-sm">
            <Image src="/icon.png" alt="" width={24} height={24} className="h-full w-full object-contain" priority />
          </span>
          <span>offshorekaihatsu.com</span>
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
          {isApp ? (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? (locale === "ja" ? "ライトモードに切り替える" : "Switch to light mode") : (locale === "ja" ? "ダークモードに切り替える" : "Switch to dark mode")}
              title={theme === "dark" ? (locale === "ja" ? "ライトモード" : "Light mode") : (locale === "ja" ? "ダークモード" : "Dark mode")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          ) : null}
          <Link href="/app" className="rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            {locale === "ja" ? "アプリ" : "App"}
          </Link>
        </div>
      </div>
    </header>
  );
}
