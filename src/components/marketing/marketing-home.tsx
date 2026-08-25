"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, SearchCheck } from "lucide-react";

import { MatchingNetwork } from "@/components/marketing/matching-network";
import { useLocale } from "@/components/i18n/locale-provider";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { SERVICE_CATEGORIES } from "@/lib/domain/service-catalog";

export function MarketingHome() {
  const { locale } = useLocale();
  const isJa = locale === "ja";

  const workflows = [
    {
      step: "01",
      title: isJa ? "公開マーケットプレイスで候補を把握" : "Browse the public marketplace first",
      text: isJa
        ? "ログイン前でも、Web、モバイル、業務システム、VR/AR、保守運用まで一覧できます。"
        : "Before logging in, buyers can browse web, mobile, business-system, VR/AR, and maintenance vendors."
    },
    {
      step: "02",
      title: isJa ? "案件マッチングで条件を具体化" : "Clarify needs through project matching",
      text: isJa
        ? "技術、人数、予算、言語要件、期間をテキスト入力で指定して検索できます。"
        : "The matching flow extracts tech, team size, budget, language, and timeline from natural language.",
    },
    {
      step: "03",
      title: isJa ? "マッチ理由付きで候補を提示" : "Show candidates with match reasons",
      text: isJa
        ? "技術一致、予算適合、体制面などの理由を見ながら比較できます。"
        : "Compare vendors with visible reasons such as technical fit, budget fit, and delivery capacity.",
    },
    {
      step: "04",
      title: isJa ? "候補保存とメッセージで商談へ" : "Move into shortlist and direct messaging",
      text: isJa
        ? "気になる会社を保存し、そのまま問い合わせとメッセージへ進めます。"
        : "Save candidates and move directly into inquiry and follow-up chat."
    }
  ];

  const marketplaceFilters = isJa
    ? [
        { label: "キーワード検索", text: "会社名や実績内容から候補を検索" },
        { label: "技術スタック", text: "React、Node.js、Java、AWSなどで絞り込み" },
        { label: "実績カテゴリ", text: "Web、モバイル、業務システム、AIなどで比較" },
        { label: "単価上限", text: "想定する時間単価に合わせて候補を整理" }
      ]
    : [
        { label: "Keyword search", text: "Search by company name or project history" },
        { label: "Tech stack", text: "Filter by React, Node.js, Java, AWS, and more" },
        { label: "Project category", text: "Compare web, mobile, business systems, AI, and more" },
        { label: "Rate ceiling", text: "Narrow candidates to your target hourly rate" }
      ];

  const faqs = [
    {
      q: isJa ? "発注企業は料金がかかりますか？" : "Do buyers pay to use the platform?",
      a: isJa
        ? "現状の基本設計では、発注企業は無料で候補検索、相談チャット、問い合わせ導線を利用できます。"
        : "In the current product design, buyers can search vendors, use the consultation flow, and contact companies without paying."
    },
    {
      q: isJa ? "掲載会社はどのように管理されますか？" : "How are listed companies managed?",
      a: isJa
        ? "開発会社は登録後に決済と必須プロフィール入力を完了すると自動で公開されます。公開後はプロフィール更新、問い合わせ対応、請求管理をダッシュボードで行えます。"
        : "After signup, vendors go live automatically once billing and the required profile fields are complete. From there, the dashboard handles profile updates, buyer inquiries, and billing."
    },
    {
      q: isJa ? "どのような条件で開発会社を絞り込めますか？" : "Which criteria can I use to filter companies?",
      a: isJa
        ? "会社名や実績内容に加え、技術スタック、実績カテゴリ、時間単価の上限で候補を絞り込めます。"
        : "You can narrow candidates by company name or project history, tech stack, project category, and hourly-rate ceiling."
    },
    {
      q: isJa ? "案件マッチングでは何ができますか？" : "What does project matching do?",
      a: isJa
        ? "作りたいもの、案件タイプ、予算、期間を順に整理し、条件に合う開発会社を比較しやすい候補として提示します。"
        : "It organizes what you want to build, the project type, budget, and timeline, then presents companies that are easier to compare against those requirements."
    },
    {
      q: isJa ? "日本語以外の言語でもやり取りできますか？" : "Can companies communicate in languages other than Japanese?",
      a: isJa
        ? "通常チャットに加え、翻訳付きプランでは会社の優先言語を基準にプロフィールとチャットの翻訳を利用できます。"
        : "Alongside standard chat, the translation plan supports profile and chat translation based on a company’s preferred language."
    }
  ];

  const serviceCategories = isJa
    ? SERVICE_CATEGORIES.map((cat) => ({ title: cat.title, services: [...cat.services] }))
    : [
        {
          title: "Web / Mobile Development",
          services: ["React", "Node.js", "Java", "Python", "Mobile Apps", "Flutter"]
        },
        {
          title: "Emerging Technologies",
          services: ["VR/AR", "Unity", "Unreal", "Blockchain", "Smart Contracts"]
        },
        {
          title: "Business Systems",
          services: ["Core Systems", "Internal Software", "ERP/CRM", "Legacy Modernization"]
        },
        {
          title: "Infrastructure / Data",
          services: ["AWS", "DevOps", "Data Engineering", "Security", "SRE"]
        }
      ];

  return (
    <div>
      <SiteNav />

      <main>
        <section className="hero-gradient-divider relative min-h-[75vh] overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7faff_60%,#edf8ff_100%)] px-6 pb-32 pt-16 md:min-h-[75vh] md:px-10 md:pb-36 md:pt-24">
          <MatchingNetwork />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.72fr,1.28fr] lg:items-center lg:gap-16">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: "easeOut" }}>
              <p className="marketing-eyebrow inline-flex text-xs font-bold tracking-[0.14em] text-blue-700">
                <span>JAPAN-FOCUSED OFFSHORE PLATFORM</span>
              </p>
              <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-4xl">
                {locale === "ja" ? (
                  <>オフショア開発を、<span className="text-blue-700">もっと早く、確かに。</span></>
                ) : (
                  <>
                    Turn offshore vendor
                    <br />
                    selection for Japanese companies
                    <br />
                    into a <span className="text-blue-700">comparable process</span>.
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                {locale === "ja" ? "offshorekaihatsu.com は、オフショア開発を検討する日本企業へ、開発会社のディレクトリ情報、案件マッチング、企業間メッセージなど、比較と選定に必要な情報を届けるシステムサービスです。" : "offshorekaihatsu.com is a Japan-focused platform for vendor discovery, project matching, company-to-company messaging, and vendor listing operations."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  {locale === "ja" ? "開発会社を探す" : "Browse vendors"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/kaihatsu-kaisha-muke" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  {locale === "ja" ? "開発会社として掲載" : "List your company"}
                </Link>
              </div>
              <div className="mt-8 grid max-w-2xl gap-2 border-t border-slate-200 pt-5 sm:grid-cols-3">
                <div className="py-1 sm:border-r sm:border-slate-200">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{locale === "ja" ? "発注企業" : "BUYER"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "掲載費・登録料無料" : "Free for buyers"}</p>
                </div>
                <div className="py-1 sm:border-r sm:border-slate-200 sm:pl-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{locale === "ja" ? "開発企業" : "VENDOR"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "月額5,000円から掲載可能" : "Listings from JPY 5,000/month"}</p>
                </div>
                <div className="py-1 sm:pl-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{locale === "ja" ? "マッチングフロー" : "FLOW"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "情報比較からメッセージまでシステム内で完結" : "One flow from comparison to conversation"}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }} className="lg:-translate-y-8">
              <div className="relative border border-slate-200 bg-slate-50 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
                <Image src="/marketing/matching-workspace.png" alt={locale === "ja" ? "案件マッチングのワークスペース" : "Project matching workspace"} width={2184} height={1440} priority className="block h-auto w-full" />
              </div>
            </motion.div>
          </div>
        </section>

        <SectionReveal className="hero-gradient-divider border-t border-slate-200 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-20">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] bg-slate-950 px-8 py-12 text-white md:px-12 md:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">BUYER FLOW</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold md:text-5xl">
                {isJa ? "発注企業が、比較と会話を切り離さずに進められる。" : "Let buyers move from comparison into conversation without changing tools."}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {workflows.map((item) => (
                <article key={item.step} className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold tracking-[0.16em] text-cyan-300">{item.step}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-3">
              <Image src="/marketing/matching-workspace.png" alt={isJa ? "案件マッチングのワークスペース" : "Project matching workspace"} width={2184} height={1440} className="block h-auto w-full rounded-[20px]" />
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="section-gradient-divider section-divider-left border-t border-slate-200 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">MARKETPLACE</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                  {isJa ? "条件を絞って、開発会社を比較する。" : "Find vendors through the filters that matter."}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                {isJa
                  ? "候補探しの起点になる4つのフィルターを使い、要件に合う開発会社を効率よく絞り込みます。"
                  : "Use the implemented filters to narrow the marketplace to vendors that meet your requirements."}
            </p>
          </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                <Image src="/marketing/directory-filters.png" alt={isJa ? "公開ディレクトリの検索フィルター" : "Directory search filters"} width={1580} height={648} className="block h-auto w-full" />
              </div>
              <div className="grid gap-3">
                {marketplaceFilters.map((filter, index) => (
                  <article key={filter.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-blue-700">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{filter.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{filter.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="section-gradient-divider section-divider-right border-t border-slate-200 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-20">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] border border-slate-200 bg-white p-8 md:p-12">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">SERVICE SCOPE</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                  {isJa ? "開発可能なカテゴリーを、事前に開示する。" : "Make service scope explicit from the start."}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                {isJa
                  ? "受託・オフショア比較で曖昧になりやすい領域を、カテゴリ単位で明確化しています。"
                  : "The marketplace makes commonly blurred offshore service areas explicit so non-technical buyers can scan them more easily."}
              </p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {serviceCategories.map((cat) => (
                <article key={cat.title} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <SearchCheck className="h-5 w-5 text-blue-700" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{cat.title}</p>
                  </div>
                  <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                    {cat.services.map((service) => (
                      <span key={service} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                        {service}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="section-gradient-divider section-divider-center border-t border-slate-200 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-20">
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">FAQ</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                {isJa ? "よくある質問事項" : "Questions people usually ask before rollout"}
              </h2>
            </div>
            <div className="mt-10 grid gap-4">
              {faqs.map((item) => (
                <article key={item.q} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-900">{item.q}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="section-gradient-divider section-divider-left border-t border-slate-200 px-6 pb-28 pt-16 md:px-10 md:pb-36 md:pt-20">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] bg-slate-950 px-8 py-12 text-white md:px-12 md:py-16">
            <div className="max-w-3xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">START NOW</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-white md:text-5xl">
                  {isJa ? (
                    <>開発会社選びを、今日から始める。</>
                  ) : (
                    <>
                      Start comparing offshore
                      <br />
                      development partners today.
                    </>
                  )}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-300">
                  {isJa
                    ? "発注企業には無料導線、開発会社には月額掲載と請求管理、双方にはメッセージ機能を用意しています。翻訳付きプランでは多言語チャットにも対応します。"
                    : "Buyers get a free path into vendor discovery. Development companies get subscription-based listings and billing controls. Both sides get direct messaging, and the translation plan adds multilingual chat support."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/app" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                    {isJa ? "アプリを見る" : "Open the App"}
                  </Link>
                  <Link href="/kaihatsu-kaisha-muke" className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                    {isJa ? "開発会社向け情報" : "For Development Vendors"}
                  </Link>
                </div>
            </div>
          </div>
        </SectionReveal>
      </main>

      <SiteFooter />
    </div>
  );
}
