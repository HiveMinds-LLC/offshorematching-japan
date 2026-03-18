"use client";

import { Languages } from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500">
        <Languages className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${locale === "ja" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
      >
        JP
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
      >
        EN
      </button>
    </div>
  );
}
