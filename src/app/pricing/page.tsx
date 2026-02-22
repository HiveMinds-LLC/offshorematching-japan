"use client";

import Link from "next/link";

import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function PricingPage() {
  return (
    <div>
      <SiteNav />
      <main>
        <section className="px-4 pb-20 pt-14">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">PRICING</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.1] text-slate-900">
                料金はシンプル、
                <br />
                運用は本格的。
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                開発会社は月額5,000円で掲載。発注企業は無料で候補探索・相談・メッセージ機能を利用できます。
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <ImagePlaceholder label="料金ページビジュアル" hint="例: 料金カード + 審査フロー図" />
            </div>
          </div>
        </section>

        <SectionReveal className="px-4 pb-20">
          <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-2">
            <article className="panel border-blue-100 bg-blue-50 p-9">
              <p className="text-xs font-semibold tracking-wide text-blue-700">開発会社向け</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold text-slate-900">¥5,000</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">/ 月</p>
              <ul className="mt-6 grid gap-2 text-sm leading-7 text-slate-700">
                <li>会社プロフィール公開</li>
                <li>公開連絡先・Webサイト掲載</li>
                <li>発注企業からの問い合わせ受信</li>
                <li>管理者審査後に公開開始</li>
              </ul>
            </article>
            <article className="panel border-emerald-100 bg-emerald-50 p-9">
              <p className="text-xs font-semibold tracking-wide text-emerald-700">発注企業向け</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold text-slate-900">無料</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">/ 月</p>
              <ul className="mt-6 grid gap-2 text-sm leading-7 text-slate-700">
                <li>公開ディレクトリの閲覧</li>
                <li>要件相談チャット</li>
                <li>候補企業比較</li>
                <li>企業間メッセージ機能</li>
              </ul>
            </article>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] bg-slate-900 px-8 py-12 text-white">
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold">審査フロー</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 1</p>
                <p className="mt-2 text-lg font-semibold">掲載申請</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">開発会社がプロフィールと連絡先を登録。</p>
              </article>
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 2</p>
                <p className="mt-2 text-lg font-semibold">管理者審査</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">管理者が内容を確認して承認/却下。</p>
              </article>
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 3</p>
                <p className="mt-2 text-lg font-semibold">公開と商談</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">承認後、発注企業から問い合わせ受信。</p>
              </article>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app/register/vendor" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                開発会社として申請
              </Link>
              <Link href="/app/register/buyer" className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                発注企業として登録
              </Link>
            </div>
          </div>
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
