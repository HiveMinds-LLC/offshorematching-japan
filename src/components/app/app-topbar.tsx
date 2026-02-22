"use client";

import Link from "next/link";

type AppTopbarProps = {
  title: string;
  subtitle?: string;
};

export function AppTopbar({ title, subtitle }: AppTopbarProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
            OffshoreMatch
          </Link>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            ホーム
          </Link>
        </div>
      </div>
    </header>
  );
}
