"use client";

import Link from "next/link";

import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

const benefits = [
  "日本企業からの相談に継続露出",
  "月額5,000円で会社情報を公開",
  "審査通過企業として信頼性を提示"
];

const requirements = [
  { title: "会社情報", text: "会社紹介・Webサイト・公開連絡先を準備" },
  { title: "対応範囲", text: "技術スタック・単価帯・体制人数を明確化" },
  { title: "審査", text: "管理者審査後に公開ディレクトリへ掲載" }
];

export default function VendorMarketPage() {
  return (
    <div>
      <SiteNav />
      <main>
        <section className="px-4 pb-20 pt-14">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">FOR VENDORS</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl">
                開発会社向け
                <br />
                掲載プログラム
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                日本企業へ自社の強みを直接届けるための掲載枠です。プロフィール公開、相談受信、メッセージ返信までを統合して運用できます。
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <ImagePlaceholder label="開発会社向けUI" hint="例: プロフィール編集・問い合わせ一覧・返信画面" />
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
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900 sm:text-4xl">掲載開始まで</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {requirements.map((item, i) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-xs font-semibold tracking-wide text-blue-700">CHECK {i + 1}</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app/register/vendor" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                掲載申請をはじめる
              </Link>
              <Link href="/pricing" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                料金を見る
              </Link>
            </div>
          </div>
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
