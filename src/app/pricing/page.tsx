"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function PricingPage() {
  const { locale } = useLocale();
  return (
    <div>
      <SiteNav />
      <main>
        <section className="px-4 pb-20 pt-14">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700">PRICING</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl">
                {locale === "ja" ? (
                  <>
                    料金はシンプル、
                    <br />
                    運用は本格的。
                  </>
                ) : (
                  <>
                    Simple pricing,
                    <br />
                    serious operations.
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {locale === "ja"
                  ? "開発会社は月額5,000円のベーシック掲載、または月額10,000円の翻訳付き掲載を選択できます。発注企業は無料で候補探索・相談・メッセージ機能を利用できます。"
                  : "Vendors can choose a basic listing at JPY 5,000 per month or a translation-enabled listing at JPY 10,000 per month. Buyers can browse, consult, and message for free."}
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <ImagePlaceholder label={locale === "ja" ? "料金ページビジュアル" : "Pricing Visual"} hint={locale === "ja" ? "例: 料金カード + 審査フロー図" : "Example: pricing cards + approval flow diagram"} />
            </div>
          </div>
        </section>

        <SectionReveal className="px-4 pb-20">
          <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-3">
            <article className="panel border-blue-100 bg-blue-50 p-9">
              <p className="text-xs font-semibold tracking-wide text-blue-700">{locale === "ja" ? "開発会社向け" : "For Vendors"}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-slate-900 sm:text-5xl">¥5,000</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{locale === "ja" ? "/ 月" : "/ month"}</p>
              <ul className="mt-6 grid gap-2 text-sm leading-7 text-slate-700">
                <li>{locale === "ja" ? "会社プロフィール公開" : "Public company profile"}</li>
                <li>{locale === "ja" ? "公開連絡先・Webサイト掲載" : "Public contact info and website"}</li>
                <li>{locale === "ja" ? "発注企業からの問い合わせ受信" : "Inbound buyer inquiries"}</li>
                <li>{locale === "ja" ? "通常チャット" : "Standard chat"}</li>
                <li>{locale === "ja" ? "決済と必須プロフィール入力後に掲載開始" : "Listed after payment and required profile completion"}</li>
              </ul>
            </article>
            <article className="panel border-emerald-100 bg-emerald-50 p-9">
              <p className="text-xs font-semibold tracking-wide text-emerald-700">{locale === "ja" ? "開発会社向け 翻訳付き" : "For Vendors with Translation"}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-slate-900 sm:text-5xl">¥10,000</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{locale === "ja" ? "/ 月" : "/ month"}</p>
              <ul className="mt-6 grid gap-2 text-sm leading-7 text-slate-700">
                <li>{locale === "ja" ? "ベーシックの全機能" : "Everything in Basic"}</li>
                <li>{locale === "ja" ? "原文 + 翻訳付きチャット" : "Original + translated chat"}</li>
                <li>{locale === "ja" ? "会社設定の優先言語に自動翻訳" : "Auto-translation into the company language"}</li>
                <li>{locale === "ja" ? "海外チームでも日本企業とやり取りしやすい" : "Easier communication with Japanese buyers"}</li>
              </ul>
            </article>
            <article className="panel border-emerald-100 bg-emerald-50 p-9">
              <p className="text-xs font-semibold tracking-wide text-emerald-700">{locale === "ja" ? "発注企業向け" : "For Buyers"}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-slate-900 sm:text-5xl">{locale === "ja" ? "無料" : "Free"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{locale === "ja" ? "/ 月" : "/ month"}</p>
              <ul className="mt-6 grid gap-2 text-sm leading-7 text-slate-700">
                <li>{locale === "ja" ? "公開ディレクトリの閲覧" : "Browse the public directory"}</li>
                <li>{locale === "ja" ? "要件相談チャット" : "Requirement consultation chat"}</li>
                <li>{locale === "ja" ? "候補企業比較" : "Compare candidate vendors"}</li>
                <li>{locale === "ja" ? "企業間メッセージ機能" : "Company-to-company messaging"}</li>
              </ul>
            </article>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24">
          <div className="mx-auto w-full max-w-7xl rounded-[28px] bg-slate-900 px-8 py-12 text-white">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">{locale === "ja" ? "導入フロー" : "Onboarding Flow"}</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 1</p>
                <p className="mt-2 text-lg font-semibold">{locale === "ja" ? "アカウント作成" : "Create Account"}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{locale === "ja" ? "開発会社が基本情報を登録し、掲載プランを選択。" : "The vendor registers basic information and chooses a listing plan."}</p>
              </article>
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 2</p>
                <p className="mt-2 text-lg font-semibold">{locale === "ja" ? "決済とプロフィール入力" : "Payment and Profile Setup"}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{locale === "ja" ? "月額決済を完了し、会社プロフィールの必須項目を入力。" : "Complete monthly billing and fill in the required public profile details."}</p>
              </article>
              <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-xs font-semibold tracking-wide text-cyan-300">STEP 3</p>
                <p className="mt-2 text-lg font-semibold">{locale === "ja" ? "掲載開始と商談" : "Go Live and Start Talks"}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{locale === "ja" ? "条件が揃うと自動で公開され、発注企業から問い合わせを受信。" : "Once payment and profile completion are in place, the listing goes live automatically and can receive buyer inquiries."}</p>
              </article>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app/register/vendor" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                {locale === "ja" ? "開発会社として申請" : "Apply as a Vendor"}
              </Link>
              <Link href="/app/register/buyer" className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                {locale === "ja" ? "発注企業として登録" : "Register as a Buyer"}
              </Link>
            </div>
          </div>
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
