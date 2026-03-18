import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export function LegalPageShell({
  eyebrow,
  title,
  subtitle,
  children
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <SiteNav />
      <main className="px-4 pb-20 pt-10">
        <section className="mx-auto w-full max-w-5xl rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm md:px-10">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">{eyebrow}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{subtitle}</p>
          <div className="mt-10 grid gap-8 text-sm leading-8 text-slate-700 md:text-[15px]">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
