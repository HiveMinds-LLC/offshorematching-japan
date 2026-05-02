"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, MessagesSquare, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";

import { ImagePlaceholder } from "@/components/marketing/image-placeholder";
import { useLocale } from "@/components/i18n/locale-provider";
import { SectionReveal } from "@/components/marketing/section-reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { SERVICE_CATEGORIES } from "@/lib/domain/service-catalog";

export function MarketingHome() {
  const { locale } = useLocale();
  const isJa = locale === "ja";

  const promises = [
    {
      title: isJa ? "比較しやすい掲載情報" : "Structured vendor listings",
      text: isJa
        ? "プロフィール、対応領域、価格帯、言語体制を比較しやすく整理します。"
        : "Profiles, service scope, price bands, and language readiness are structured for fast comparison.",
      icon: ShieldCheck
    },
    {
      title: isJa ? "要件整理から始められる" : "Start from requirements, not paperwork",
      text: isJa
        ? "RFPが未完成でも、チャット形式で条件を整理して候補選定へ進めます。"
        : "Even without a finished RFP, buyers can turn rough requirements into a shortlist through chat.",
      icon: Sparkles
    },
    {
      title: isJa ? "そのまま企業間会話へ" : "Move directly into company-to-company chat",
      text: isJa
        ? "候補保存、問い合わせ、継続メッセージを同じ導線で進められます。"
        : "Shortlisting, inquiries, and ongoing messages stay in one flow.",
      icon: MessagesSquare
    }
  ];

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
        ? "技術、人数、予算、言語要件、期間を自然文から抽出します。"
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
        ? "気になる会社を保存し、そのまま問い合わせと継続会話に進めます。"
        : "Save candidates and move directly into inquiry and follow-up chat."
    }
  ];

  const screenshots = [
    {
      label: isJa ? "スクリーンショット 1: マーケットプレイス一覧" : "Screenshot 1: Marketplace directory",
      hint: isJa
        ? "掲載会社カード、単価帯、対応領域、保存ボタンが一度に見える俯瞰画面。PC幅で3列表示の状態が適切。"
        : "Use a wide marketplace view showing vendor cards, price bands, service categories, and shortlist buttons in a three-column desktop layout."
    },
    {
      label: isJa ? "スクリーンショット 2: 発注企業の案件マッチング画面" : "Screenshot 2: Buyer project matching view",
      hint: isJa
        ? "左に相談チャット、右に抽出要件とマッチ候補が並ぶ状態。マッチ理由バッジが見えていると良い。"
        : "Show the chat on the left and extracted criteria plus matched vendors on the right, with visible match-reason badges."
    },
    {
      label: isJa ? "スクリーンショット 3: 開発会社のメッセージ/請求画面" : "Screenshot 3: Vendor inbox and billing",
      hint: isJa
        ? "問い合わせ一覧、翻訳付きチャット、請求状態カードが同じダッシュボード内にある状態。"
        : "Show inquiry threads, translated chat for premium vendors, and billing status cards in the same dashboard."
    }
  ];

  const featureRows = [
    {
      title: isJa ? "発注企業向け" : "For buyers",
      points: isJa
        ? ["公開ディレクトリ閲覧", "案件マッチング", "候補保存", "企業間メッセージ", "過去案件の確認"]
        : ["Public vendor directory", "Project matching", "Saved shortlist", "Company-to-company messaging", "Past project tracking"]
    },
    {
      title: isJa ? "開発会社向け" : "For development vendors",
      points: isJa
        ? ["月額5,000円から掲載", "公開プロフィール編集", "問い合わせ受信", "請求停止・再開・解約", "翻訳付きチャット"]
        : ["Listings from JPY 5,000 / month", "Edit the public profile", "Receive buyer inquiries", "Pause, resume, or cancel billing", "Translation-enabled chat"]
    }
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
      q: isJa ? "将来的に何を強化する想定ですか？" : "What is planned next?",
      a: isJa
        ? "通知、比較表出力、返信SLAの可視化、さらにマッチング精度の改善などが自然な拡張です。"
        : "Natural next steps include notifications, comparison-sheet export, response SLA visibility, and further matching improvements."
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

  const nextFeatureItems = isJa
    ? ["比較表PDF", "案件テンプレート", "未返信アラート", "実績ギャラリー", "Realtime翻訳チャット"]
    : ["Comparison PDF", "Project brief template", "Unanswered inquiry alerts", "Portfolio gallery", "Realtime translated chat"];

  return (
    <div>
      <SiteNav />

      <main>
        <section className="relative overflow-hidden px-4 pb-28 pt-16 md:pb-36 md:pt-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.20),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf3ff_100%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.08fr,0.92fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: "easeOut" }}>
              <p className="inline-flex rounded-full border border-blue-200 bg-white/90 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-blue-700">
                JAPAN-FOCUSED OFFSHORE PLATFORM
              </p>
              <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.03] text-slate-900 md:text-7xl">
                {locale === "ja" ? (
                  <>
                    日本企業の
                    <br />
                    オフショア開発選定を、
                    <br />
                    <span className="text-blue-700">比較可能なプロセス</span>へ。
                  </>
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
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                {locale === "ja" ? "offshoredevelopment.com は、公開ディレクトリ、案件マッチング、企業間メッセージ、開発会社の掲載運用をまとめた日本市場向けプラットフォームです。" : "offshoredevelopment.com is a Japan-focused platform for vendor discovery, project matching, company-to-company messaging, and vendor listing operations."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  {locale === "ja" ? "アプリを試す" : "Try the App"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {locale === "ja" ? "料金を見る" : "View Pricing"}
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">BUYER</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "発注企業は無料利用" : "Free for buyers"}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">VENDOR</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "掲載料は月額 ¥5,000" : "Listings from JPY 5,000/month"}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">FLOW</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{locale === "ja" ? "比較から会話まで同じ導線" : "One flow from comparison to conversation"}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}>
              <div className="relative rounded-[32px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
                <div className="absolute right-4 top-4 z-20 hidden rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:block">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-blue-700">APP SNAPSHOT</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{locale === "ja" ? "マーケットプレイス + 案件マッチング + メッセージ" : "Marketplace + Project Matching + Messaging"}</p>
                </div>
                <ImagePlaceholder label={locale === "ja" ? "ヒーロースクリーンショット" : "Hero Screenshot"} hint={locale === "ja" ? "推奨画像: マーケットプレイス一覧と右側に相談導線が見えるトップ画面。サービス全体像が一目で伝わる構図。" : "Suggested image: a top-level marketplace screen with the consultation entry visible on the right."} />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 pb-24 md:pb-32">
          <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-3">
            {promises.map((item, index) => {
              const Icon = item.icon;
              return (
                <SectionReveal key={item.title} delay={index * 0.08} className="panel flex h-full flex-col p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{item.title}</h2>
                  <p className="mt-4 flex-1 text-base leading-8 text-slate-600">{item.text}</p>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-[32px] border border-slate-200 bg-white p-8 md:p-12 lg:grid-cols-[0.9fr,1.1fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">WHY THIS PRODUCT</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                {isJa ? (
                  <>
                    オフショア開発のリスクを、
                    <br />
                    比較段階から減らす。
                  </>
                ) : (
                  <>
                    Reduce offshore delivery risk
                    <br />
                    before delivery even starts.
                  </>
                )}
              </h2>
            </div>
            <div className="grid gap-4 text-base leading-8 text-slate-600">
              <p>
                {isJa
                  ? "多くの比較サイトは、会社名と曖昧な紹介文だけで終わります。発注側は比較しづらく、掲載側も問い合わせに繋がりません。"
                  : "Many comparison sites stop at a company name and a vague summary. Buyers struggle to compare, and vendors struggle to turn traffic into real inquiries."}
              </p>
              <p>
                {isJa
                  ? "offshoredevelopment.com は、技術領域、単価帯、言語体制、公開プロフィール、案件マッチング、問い合わせ導線を一つの体験にまとめています。"
                  : "offshoredevelopment.com combines technical scope, pricing bands, language readiness, public profiles, project matching, and inquiry routing in one experience."}
              </p>
              <p>
                {isJa
                  ? "ただの集客LPではなく、商談前の比較と選定を整流化するための実務プロダクトです。"
                  : "This is not just a lead-generation page. It is a product for structuring comparison and pre-sales selection."}
              </p>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24 md:pb-32">
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
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">PRODUCT SCREENSHOTS</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                  {isJa ? "実際の画面イメージで導線を伝える。" : "Show the product, not just the promise."}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                {isJa
                  ? "実画面に近いデスクトップ幅のプレビューで、マーケットプレイス、案件マッチング、メッセージ/請求の流れを見せています。"
                  : "These desktop-framed previews mirror the real marketplace, project matching, and messaging/billing flows."}
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {screenshots.map((shot, index) => (
                <SectionReveal key={shot.label} delay={index * 0.06} className="h-full">
                  <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                    <ImagePlaceholder label={shot.label} hint={shot.hint} />
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] border border-slate-200 bg-white p-8 md:p-12">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">SERVICE SCOPE</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                  {isJa ? "提供領域を最初から明示する。" : "Make service scope explicit from the start."}
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

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-2">
            {featureRows.map((row) => (
              <div key={row.title} className="flex h-full flex-col rounded-[30px] border border-slate-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{row.title}</h2>
                </div>
                <ul className="mt-6 grid flex-1 gap-3 text-sm leading-7 text-slate-600">
                  {row.points.map((point) => (
                    <li key={point} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 px-8 py-12 text-white md:px-12 md:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-100">WHAT ELSE SHOULD EXIST</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold md:text-5xl">
                {isJa ? "次に相性が良い機能" : "What fits naturally next"}
              </h2>
              <p className="mt-4 text-base leading-8 text-blue-50">
                {isJa
                  ? "現在の設計と相性が良く、実装価値が高いのは「比較表出力」「案件テンプレート」「未返信アラート」「実績ギャラリー」「翻訳API＋Realtime chat」です。"
                  : "The most natural next additions are comparison-sheet export, project brief templates, unanswered inquiry alerts, portfolio galleries, and realtime translation-enabled chat."}
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {nextFeatureItems.map((item) => (
                <div key={item} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-sm font-semibold text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="px-4 pb-24 md:pb-32">
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">FAQ</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                {isJa ? "導入前に確認されやすいこと" : "Questions people usually ask before rollout"}
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

        <SectionReveal className="px-4 pb-28 md:pb-36">
          <div className="mx-auto w-full max-w-7xl rounded-[32px] border border-slate-200 bg-white px-8 py-12 md:px-12 md:py-16">
            <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-blue-700">START NOW</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-900 md:text-5xl">
                  {isJa ? (
                    <>
                      比較だけで終わらない
                      <br />
                      オフショア開発LPへ。
                    </>
                  ) : (
                    <>
                      Build an offshore product site
                      <br />
                      that continues into real conversations.
                    </>
                  )}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  {isJa
                    ? "発注企業には無料導線、開発会社には月額掲載と請求管理、双方にはメッセージ機能を用意しています。翻訳付きプランでは多言語チャットにも対応します。"
                    : "Buyers get a free path into vendor discovery. Development companies get subscription-based listings and billing controls. Both sides get direct messaging, and the translation plan adds multilingual chat support."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/app" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    {isJa ? "アプリを見る" : "Open the App"}
                  </Link>
                  <Link href="/kaihatsu-kaisha-muke" className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {isJa ? "開発会社向け情報" : "For Development Vendors"}
                  </Link>
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <ImagePlaceholder
                  label={isJa ? "最終CTA用ビジュアル" : "Final CTA visual"}
                  hint={
                    isJa
                      ? "推奨画像: 発注企業側と開発会社側の2画面を合成し、比較から会話までの一連の流れが伝わる画像。"
                      : "Suggested image: a combined visual showing both buyer and vendor screens so the journey from comparison to conversation is immediately clear."
                  }
                />
              </div>
            </div>
          </div>
        </SectionReveal>
      </main>

      <SiteFooter />
    </div>
  );
}
