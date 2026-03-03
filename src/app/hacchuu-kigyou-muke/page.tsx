"use client";

import Link from "next/link";

import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

const benefits = [
  "比較工数を削減し、候補選定を高速化",
  "要件相談から候補抽出まで一画面で完結",
  "審査済み企業の中から安心して選べる"
];

const flow = [
  { title: "相談入力", text: "必要技術・予算・体制をチャットで入力" },
  { title: "候補比較", text: "候補会社を比較し、優先度を整理" },
  { title: "商談開始", text: "そのまま企業間メッセージで連絡" }
];

export default function BuyerMarketPage() {
  return (
    <div>
      <SiteNav />
      <main>
        <section className="px-4 pb-20 pt-14">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">FOR BUYERS</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl">
                発注企業向け
                <br />
                パートナー探索ページ
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                候補探索から要件整理、メッセージでの初回連絡まで。調達チームが必要とする初期検討プロセスを一気通貫でサポートします。
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <ImagePlaceholder label="発注企業向けUI" hint="例: 要件入力・候補比較・メッセージ画面" />
            </div>
          </div>
        </section>

        <SectionReveal className="px-4 pb-20">
          <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-3">
            {benefits.map((item) => (
              <article key={item} className="panel p-8">
                <p className="text-xs font-semibold tracking-wide text-blue-700">BENEFIT</p>
                <p className="mt-3 text-lg leading-8 text-slate-800">{item}</p>
              </article>
            ))}
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] border border-slate-200 bg-white p-10">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900 sm:text-4xl">導入フロー</h2>
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
              <Link href="/app" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">アプリで相談開始</Link>
              <Link href="/pricing" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">料金を見る</Link>
            </div>
          </div>
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
