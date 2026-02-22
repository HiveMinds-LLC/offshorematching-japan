"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { SERVICE_CATEGORIES } from "@/lib/domain/service-catalog";

const pillars = [
  {
    title: "審査済みディレクトリ",
    text: "公開前に開発会社を審査。発注企業は安心して比較開始。"
  },
  {
    title: "要件チャットで整理",
    text: "曖昧な相談を要件に変換し、比較可能な候補へ接続。"
  },
  {
    title: "企業間メッセージ",
    text: "マッチした会社とそのまま会話し、商談に移行。"
  }
];

export function MarketingHome() {
  return (
    <div>
      <SiteNav />

      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_42%),linear-gradient(180deg,#f6faff_0%,#eef4ff_100%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">FOR JAPANESE COMPANIES</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.1] text-slate-900 md:text-6xl">
                オフショア開発の選定を、
                <br />
                <span className="text-blue-700">信頼できる体験</span>に。
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                OffshoreMatchは、発注企業と開発会社を結ぶ日本向けプラットフォームです。候補探索、要件整理、企業間チャットまでを一気通貫で提供します。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  アプリを試す
                </Link>
                <Link href="/pricing" className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  料金を見る
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: "easeOut", delay: 0.12 }}>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-2xl backdrop-blur">
                <ImagePlaceholder label="ヒーロービジュアル" hint="例: マーケットプレイス・マッチング・チャットの統合画面" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <SectionReveal key={pillar.title} delay={index * 0.08} className="panel p-8">
                <p className="text-xs font-semibold tracking-wide text-blue-700">CORE</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{pillar.title}</h2>
                <p className="mt-4 text-base leading-8 text-slate-600">{pillar.text}</p>
              </SectionReveal>
            ))}
          </div>
        </section>

        <SectionReveal className="px-4 pb-24">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] border border-slate-200 bg-white p-10">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-wide text-blue-700">SERVICE SCOPE</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900">対応領域を、最初から明確に。</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">Web・モバイルだけでなく、VR/AR、Blockchain、社内システム開発まで対応可能な会社を掲載。</p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {SERVICE_CATEGORIES.map((cat) => (
                <article key={cat.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">{cat.title}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cat.services.map((service) => (
                      <span key={service} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{service}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-28">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] bg-slate-900 px-8 py-12 text-white">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold tracking-wide text-cyan-300">START NOW</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold">商談開始までの距離を、最短化。</h2>
                <p className="mt-4 text-base leading-8 text-slate-300">発注企業は無料で候補探索とメッセージ機能を利用できます。開発会社は月額5,000円で掲載申請が可能です。</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/hacchuu-kigyou-muke" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                    発注企業向け
                  </Link>
                  <Link href="/kaihatsu-kaisha-muke" className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                    開発会社向け
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <ImagePlaceholder label="導入イメージ" hint="例: 相談から商談までのフロー図" />
              </div>
            </div>
          </div>
        </SectionReveal>
      </main>

      <SiteFooter />
    </div>
  );
}
