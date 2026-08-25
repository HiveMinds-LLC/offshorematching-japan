"use client";

import Link from "next/link";
import Image from "next/image";

import { useLocale } from "@/components/i18n/locale-provider";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function BuyerMarketPage() {
  const { locale } = useLocale();
  const benefits = locale === "ja"
    ? [
        "比較工数を削減し、候補選定を高速化",
        "要件相談から候補抽出まで一画面で完結",
        "条件が整った掲載企業を比較しやすい"
      ]
    : [
        "Reduce comparison effort and shortlist faster",
        "Go from requirements to candidates in one flow",
        "Compare listed vendors with the key information already in place"
      ];
  const flow = locale === "ja"
    ? [
        { title: "相談入力", text: "必要技術・予算・体制をチャットで入力" },
        { title: "候補比較", text: "候補会社を比較し、優先度を整理" },
        { title: "商談開始", text: "そのまま企業間メッセージで連絡" }
      ]
    : [
        { title: "Enter requirements", text: "Describe the needed tech, budget, and delivery setup in chat." },
        { title: "Compare vendors", text: "Review candidate companies and prioritize them." },
        { title: "Start the conversation", text: "Move directly into company-to-company messaging." }
      ];
  return (
    <div>
      <SiteNav />
      <main>
        <section className="bg-slate-50 px-6 pb-24 pt-20 md:px-10">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">FOR BUYERS</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl">
                {locale === "ja" ? (
                  <>発注企業向け比較と相談の導線</>
                ) : (
                  <>
                    A buyer flow built for
                    <br />
                    comparison and discovery
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {locale === "ja" ? "候補探索から要件整理、初回問い合わせまで。調達チームが必要とする初期検討プロセスを一つの流れで支えます。" : "From discovery to requirements clarification and first contact, this flow supports the early-stage evaluation work procurement teams actually need."}
              </p>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
              <Image src="/marketing/marketplace.png" alt={locale === "ja" ? "開発会社を比較するマーケットプレイス" : "Vendor marketplace"} width={1265} height={713} priority className="block h-auto w-full" />
            </div>
          </div>
        </section>

        <SectionReveal className="px-6 pb-20 pt-16 md:px-10 md:pt-20">
          <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-3">
            {benefits.map((item) => (
              <article key={item} className="panel p-8">
                <p className="text-xs font-semibold tracking-wide text-blue-700">{locale === "ja" ? "BENEFIT" : "BENEFIT"}</p>
                <p className="mt-3 text-lg leading-8 text-slate-800">{item}</p>
              </article>
            ))}
          </div>
        </SectionReveal>

        <SectionReveal className="px-6 pb-24 pt-16 md:px-10 md:pt-20">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] border border-slate-200 bg-white p-10">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900 sm:text-4xl">{locale === "ja" ? "導入フロー" : "Flow"}</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {flow.map((step, i) => (
                <article key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-xs font-semibold tracking-wide text-blue-700">STEP {i + 1}</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">{locale === "ja" ? "アプリで相談開始" : "Start in the App"}</Link>
              <Link href="/pricing" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{locale === "ja" ? "料金を見る" : "View Pricing"}</Link>
            </div>
          </div>
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
