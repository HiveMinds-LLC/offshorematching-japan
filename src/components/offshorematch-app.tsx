"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Building2, FolderKanban, Languages, MessageSquareMore, ShieldCheck, Sparkles, Star, Users, Wallet } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_COMPANIES, SEED_PROJECT_HISTORY, SEED_VENDOR_APPLICATIONS } from "@/lib/data/mockData";
import { PROJECT_FILTER_OPTIONS, TECH_FILTER_OPTIONS } from "@/lib/domain/service-catalog";
import type { BuyerCriteria, BuyerOrganization, Company, DealRecord, DealStatus, MatchResult, MessageRecord, PortfolioProject, ProjectHistoryRecord, VendorApplication, VendorBillingAccount, VendorPreferredLanguage } from "@/lib/domain/types";
import { runTierAwareMatch } from "@/lib/matching";

type SessionRole = "guest" | "buyer" | "vendor";
type AppSectionKey =
  | "marketplace"
  | "auth"
  | "buyer-overview"
  | "buyer-matching"
  | "buyer-saved"
  | "buyer-messages"
  | "buyer-projects"
  | "vendor-overview"
  | "vendor-profile"
  | "vendor-messages"
  | "vendor-projects"
  | "vendor-billing";

type VendorLoginForm = {
  email: string;
  password: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

type BuyerThread = {
  id: string;
  buyerEmail: string;
  vendorCompanyId: string;
  createdAt: string;
};

type ThreadOverview = {
  threadId: string;
  counterpartyLabel: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  status: DealStatus;
};

const dealStatusOptions: DealStatus[] = ["相談中", "進行中", "完了"];

const vendorLoginDefaults: VendorLoginForm = {
  email: "",
  password: ""
};

const quickPrompts = [
  "React + Node.js エンジニア4名、6ヶ月、時給30ドルまで",
  "Java/Springのバックエンドチームを探しています。英語は必須です",
  "AWS移行を3ヶ月で進めたい。DevOps経験のある会社希望"
];

const VENDOR_DEMO_LOGIN = {
  email: "vendor-demo@offshorematch.jp",
  password: "vendor1234"
};
const MARKETPLACE_PAGE_SIZE = 9;

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function levelLabel(value: Company["english"]) {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  return "標準";
}

function levelLabelForLocale(value: Company["english"], locale: "ja" | "en") {
  if (locale === "ja") return levelLabel(value);
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Standard";
}

function dealStatusLabel(status: DealStatus, locale: "ja" | "en") {
  if (locale === "ja") return status;
  if (status === "相談中") return "Consulting";
  if (status === "進行中") return "In Progress";
  return "Completed";
}

function planLabel(plan: Company["plan"]) {
  return plan === "translation" ? "翻訳付き" : "ベーシック";
}

function monthlyPriceLabel(plan: Company["plan"]) {
  return plan === "translation" ? "¥10,000/月" : "¥5,000/月";
}

function isPrimaryActionSection(key: AppSectionKey) {
  return key === "buyer-matching";
}

function languageLabel(language: VendorPreferredLanguage | undefined) {
  switch (language) {
    case "ja": return "日本語";
    case "vi": return "Vietnamese";
    case "id": return "Indonesian";
    case "th": return "Thai";
    case "pl": return "Polish";
    case "ro": return "Romanian";
    case "ko": return "Korean";
    case "hi": return "Hindi";
    case "uk": return "Ukrainian";
    case "et": return "Estonian";
    case "es": return "Spanish";
    case "ms": return "Malay";
    case "tl": return "Tagalog";
    case "en":
    default:
      return "English";
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function emptyPortfolioProject(): PortfolioProject {
  return {
    id: makeId("portfolio"),
    title: "",
    projectType: "Webサービス",
    summary: "",
    durationLabel: "",
    budgetLabel: "",
    technologies: [],
    businessImpact: ""
  };
}

function PortfolioProjectSummaryCard({ project }: { project: PortfolioProject }) {
  const locale: "ja" | "en" = "ja";
  return (
    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{project.title}</p>
        <Badge>{project.projectType}</Badge>
      </div>
      <p className="text-sm leading-6 text-slate-700">{project.summary}</p>
      <div className="grid gap-1 text-xs text-slate-600">
        <p>{locale === "ja" ? "期間" : "Timeline"}: <span className="font-semibold text-slate-900">{project.durationLabel}</span></p>
        <p>{locale === "ja" ? "予算目安" : "Budget"}: <span className="font-semibold text-slate-900">{project.budgetLabel}</span></p>
        <p>{locale === "ja" ? "成果" : "Impact"}: <span className="font-semibold text-slate-900">{project.businessImpact}</span></p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {project.technologies.map((tech) => (
          <Badge key={`${project.id}-${tech}`}>{tech}</Badge>
        ))}
      </div>
    </Card>
  );
}

function CompanyCard({ company, score, locale = "ja" }: { company: Company; score?: number; locale?: "ja" | "en" }) {
  const projectScale = company.teamSize >= 100 ? "大規模案件" : company.teamSize >= 30 ? "中規模案件" : "小〜中規模案件";
  const primaryProjectType = company.portfolioProjects[0]?.projectType;

  return (
    <Link href={`/companies/${company.id}`} className="block h-full transition hover:-translate-y-0.5">
      <Card className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900">{company.name}</h4>
            <p className={`mt-0.5 text-xs font-semibold ${company.plan === "translation" ? "text-emerald-700" : "text-blue-700"}`}>{locale === "ja" ? "掲載プラン" : "Plan"}: {locale === "ja" ? planLabel(company.plan) : company.plan === "translation" ? "Translation" : "Basic"}（{monthlyPriceLabel(company.plan)}）</p>
          </div>
        </div>

        <p className="min-h-[96px] text-sm leading-6 text-slate-700">{company.summary}</p>

        <div className="flex min-h-[64px] flex-wrap content-start gap-1.5">
          {company.services.slice(0, 4).map((service) => (
            <Badge key={service}>{service}</Badge>
          ))}
        </div>

        {primaryProjectType ? <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "主な実績" : "Primary Work"}: <span className="text-slate-900">{primaryProjectType}</span></p> : null}

        <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-500" />
            {locale === "ja" ? "単価目安" : "Rate range"}: <span className="font-semibold text-slate-900">${company.minRate}-${company.maxRate}/h</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {company.country} | {company.teamSize}{locale === "ja" ? "名" : ""} | {locale === "ja" ? projectScale : company.teamSize >= 100 ? "Large projects" : company.teamSize >= 30 ? "Mid-size projects" : "Small to mid-size"}
          </p>
          <p className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            {locale === "ja" ? "英語" : "English"} {levelLabelForLocale(company.english, locale)} / {locale === "ja" ? "日本語" : "Japanese"} {levelLabelForLocale(company.japaneseSupport, locale)}
          </p>
        </div>

        <p className="mt-auto text-xs font-semibold text-blue-700 underline underline-offset-2">{locale === "ja" ? "会社プロフィールを見る" : "View company profile"}</p>
        {typeof score === "number" ? <p className="text-xs font-semibold text-emerald-700">{locale === "ja" ? "マッチスコア" : "Match score"}: {score.toFixed(1)}</p> : null}
      </Card>
    </Link>
  );
}

export function OffshoreMatchApp() {
  const { locale } = useLocale();
  const [activeSection, setActiveSection] = useState<AppSectionKey>("marketplace");
  const [sessionRole, setSessionRole] = useState<SessionRole>("guest");
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>(SEED_VENDOR_APPLICATIONS);

  const [query, setQuery] = useState("");
  const [techFilter, setTechFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [rateCap, setRateCap] = useState("");
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [favoriteCompanyIds, setFavoriteCompanyIds] = useState<string[]>([]);

  const [vendorLoginForm, setVendorLoginForm] = useState<VendorLoginForm>(vendorLoginDefaults);
  const [vendorLoginMessage, setVendorLoginMessage] = useState("");
  const [activeVendorCompany, setActiveVendorCompany] = useState<Company | null>(null);
  const [vendorProfileForm, setVendorProfileForm] = useState({
    websiteUrl: "",
    publicContactEmail: "",
    publicContactPhone: "",
    preferredLanguage: "en" as VendorPreferredLanguage,
    summary: "",
    portfolioProjects: [] as PortfolioProject[]
  });
  const [vendorProfileMessage, setVendorProfileMessage] = useState("");
  const [profileTranslationMessage, setProfileTranslationMessage] = useState("");
  const [profileTranslationLoading, setProfileTranslationLoading] = useState(false);
  const [vendorBilling, setVendorBilling] = useState<VendorBillingAccount | null>(null);
  const [vendorBillingMessage, setVendorBillingMessage] = useState("");
  const [billingActionLoading, setBillingActionLoading] = useState("");

  const [buyerLoginEmail, setBuyerLoginEmail] = useState("buyer@example.jp");
  const [buyerLoginPassword, setBuyerLoginPassword] = useState("demo1234");
  const [buyerLoginMessage, setBuyerLoginMessage] = useState("");
  const [activeBuyer, setActiveBuyer] = useState<BuyerOrganization | null>(null);
  const [threads, setThreads] = useState<BuyerThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [threadMessages, setThreadMessages] = useState<MessageRecord[]>([]);
  const [activeBuyerDeal, setActiveBuyerDeal] = useState<DealRecord | null>(null);
  const [buyerThreadOverview, setBuyerThreadOverview] = useState<ThreadOverview[]>([]);
  const [threadInput, setThreadInput] = useState("");
  const [threadMessageInfo, setThreadMessageInfo] = useState("");
  const [vendorThreads, setVendorThreads] = useState<BuyerThread[]>([]);
  const [activeVendorThreadId, setActiveVendorThreadId] = useState("");
  const [vendorThreadMessages, setVendorThreadMessages] = useState<MessageRecord[]>([]);
  const [activeVendorDeal, setActiveVendorDeal] = useState<DealRecord | null>(null);
  const [vendorThreadOverview, setVendorThreadOverview] = useState<ThreadOverview[]>([]);
  const [vendorThreadInput, setVendorThreadInput] = useState("");
  const [vendorThreadMessageInfo, setVendorThreadMessageInfo] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: makeId("chat"),
      role: "assistant",
      content: "ご希望の開発体制を自然文で入力してください。要件を整理し、最適な候補会社を提案します。",
      createdAt: new Date().toISOString()
    }
  ]);
  const [criteria, setCriteria] = useState<BuyerCriteria | null>(null);

  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: payload.error ?? "リクエストに失敗しました。" };
    return { ok: true, data: payload };
  }

  async function refreshCompanies() {
    const response = await readJson<{ companies: Company[] }>("/api/vendors/companies");
    if (!response.ok || !response.data) return;
    setCompanies(response.data.companies);
  }

  async function refreshApplications() {
    const response = await readJson<{ applications: VendorApplication[] }>("/api/vendors/applications");
    if (!response.ok || !response.data) return;
    setVendorApplications(response.data.applications);
  }

  async function refreshThreads() {
    const response = await readJson<{ threads: BuyerThread[] }>("/api/messages/threads");
    const data = response.data;
    if (!response.ok || !data) return;
    setThreads(data.threads);
    setActiveThreadId((current) => current || data.threads[0]?.id || "");
  }

  async function refreshSession() {
    const response = await readJson<{ buyer: BuyerOrganization | null }>("/api/auth/session");
    if (!response.ok || !response.data) return;
    setActiveBuyer(response.data.buyer);
    if (response.data.buyer) {
      setSessionRole("buyer");
      await refreshThreads();
    }
  }

  async function refreshThreadMessages(threadId: string) {
    if (!threadId) return;
    const response = await readJson<{ messages: MessageRecord[] }>(`/api/messages/threads/${threadId}/messages`);
    if (!response.ok || !response.data) return;
    setThreadMessages(response.data.messages);
  }

  async function refreshBuyerDeal(threadId: string) {
    if (!threadId) return;
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/threads/${threadId}/deal`);
    if (!response.ok || !response.data) return;
    setActiveBuyerDeal(response.data.deal);
  }

  async function refreshVendorThreads(vendorCompanyId: string) {
    const response = await readJson<{ threads: BuyerThread[] }>(
      `/api/messages/vendor/threads?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    if (!response.ok || !response.data) return;
    setVendorThreads(response.data.threads);
    setActiveVendorThreadId((current) => current || response.data!.threads[0]?.id || "");
  }

  async function refreshVendorBilling(vendorCompanyId: string) {
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${vendorCompanyId}`);
    if (!response.ok || !response.data) return;
    setVendorBilling(response.data.billingAccount);
  }

  async function refreshVendorThreadMessages(threadId: string, vendorCompanyId: string) {
    if (!threadId || !vendorCompanyId) return;
    const response = await readJson<{ messages: MessageRecord[] }>(
      `/api/messages/vendor/threads/${threadId}/messages?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    if (!response.ok || !response.data) return;
    setVendorThreadMessages(response.data.messages);
  }

  async function refreshVendorDeal(threadId: string, vendorCompanyId: string) {
    if (!threadId || !vendorCompanyId) return;
    const response = await readJson<{ deal: DealRecord | null }>(
      `/api/messages/vendor/threads/${threadId}/deal?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    if (!response.ok || !response.data) return;
    setActiveVendorDeal(response.data.deal);
  }

  async function buildBuyerThreadOverview(nextThreads: BuyerThread[]) {
    const overviews = await Promise.all(
      nextThreads.map(async (thread) => {
        const response = await readJson<{ messages: MessageRecord[] }>(`/api/messages/threads/${thread.id}/messages`);
        const messages = response.data?.messages ?? [];
        const latest = messages[messages.length - 1];
        return {
          threadId: thread.id,
          counterpartyLabel: companies.find((company) => company.id === thread.vendorCompanyId)?.name ?? "Unknown Vendor",
          lastMessage: latest?.body ?? "まだメッセージはありません。",
          lastMessageAt: latest?.createdAt ?? thread.createdAt,
          messageCount: messages.length,
          status: (await getDealByThreadForBuyer(thread.id))?.status ?? "相談中"
        } satisfies ThreadOverview;
      })
    );
    setBuyerThreadOverview(overviews.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
  }

  async function buildVendorThreadOverview(nextThreads: BuyerThread[], vendorCompanyId: string) {
    const overviews = await Promise.all(
      nextThreads.map(async (thread) => {
        const response = await readJson<{ messages: MessageRecord[] }>(
          `/api/messages/vendor/threads/${thread.id}/messages?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
        );
        const messages = response.data?.messages ?? [];
        const latest = messages[messages.length - 1];
        return {
          threadId: thread.id,
          counterpartyLabel: thread.buyerEmail,
          lastMessage: latest?.body ?? "まだメッセージはありません。",
          lastMessageAt: latest?.createdAt ?? thread.createdAt,
          messageCount: messages.length,
          status: (await getDealByThreadForVendor(thread.id, vendorCompanyId))?.status ?? "相談中"
        } satisfies ThreadOverview;
      })
    );
    setVendorThreadOverview(overviews.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([refreshCompanies(), refreshApplications(), refreshSession()]);
    })();
  }, []);

  const favoritesStorageKey = activeBuyer ? `offshorematch-favorites:${activeBuyer.email.toLowerCase()}` : "offshorematch-favorites:guest";

  useEffect(() => {
    const stored = window.localStorage.getItem(favoritesStorageKey);
    if (!stored) {
      setFavoriteCompanyIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) setFavoriteCompanyIds(parsed);
    } catch {
      window.localStorage.removeItem(favoritesStorageKey);
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteCompanyIds));
  }, [favoriteCompanyIds, favoritesStorageKey]);

  useEffect(() => {
    if (!activeThreadId) {
      setThreadMessages([]);
      setActiveBuyerDeal(null);
      return;
    }
    void refreshThreadMessages(activeThreadId);
    void refreshBuyerDeal(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeVendorThreadId || !activeVendorCompany) {
      setVendorThreadMessages([]);
      setActiveVendorDeal(null);
      return;
    }
    void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
    void refreshVendorDeal(activeVendorThreadId, activeVendorCompany.id);
  }, [activeVendorThreadId, activeVendorCompany]);

  useEffect(() => {
    if (!activeVendorCompany) {
      setVendorBilling(null);
      return;
    }
    void refreshVendorBilling(activeVendorCompany.id);
  }, [activeVendorCompany]);

  useEffect(() => {
    if (sessionRole !== "buyer" || !activeBuyer) return;
    const interval = window.setInterval(() => {
      void refreshThreads();
      if (activeThreadId) void refreshThreadMessages(activeThreadId);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [sessionRole, activeBuyer, activeThreadId]);

  useEffect(() => {
    if (sessionRole !== "buyer") {
      setBuyerThreadOverview([]);
      return;
    }
    void buildBuyerThreadOverview(threads);
  }, [threads, sessionRole, companies]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) return;
    const interval = window.setInterval(() => {
      void refreshVendorThreads(activeVendorCompany.id);
      if (activeVendorThreadId) void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [sessionRole, activeVendorCompany, activeVendorThreadId]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) {
      setVendorThreadOverview([]);
      return;
    }
    void buildVendorThreadOverview(vendorThreads, activeVendorCompany.id);
  }, [vendorThreads, sessionRole, activeVendorCompany]);

  useEffect(() => {
    if (activeBuyer && activeSection === "auth") {
      setActiveSection("buyer-overview");
    }
  }, [activeBuyer, activeSection]);

  useEffect(() => {
    if (!activeVendorCompany) {
      setVendorProfileForm({ websiteUrl: "", publicContactEmail: "", publicContactPhone: "", preferredLanguage: "en", summary: "", portfolioProjects: [] });
      return;
    }
    setVendorProfileForm({
      websiteUrl: activeVendorCompany.websiteUrl ?? "",
      publicContactEmail: activeVendorCompany.publicContactEmail ?? "",
      publicContactPhone: activeVendorCompany.publicContactPhone ?? "",
      preferredLanguage: activeVendorCompany.preferredLanguage ?? "en",
      summary: activeVendorCompany.summary,
      portfolioProjects: activeVendorCompany.portfolioProjects
    });
  }, [activeVendorCompany]);

  const visibleSections = useMemo(() => {
    const guestSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "auth", label: locale === "ja" ? "ログイン" : "Login" }
    ];
    const buyerSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "buyer-overview", label: locale === "ja" ? "概要" : "Overview" },
      { key: "buyer-saved", label: locale === "ja" ? "保存候補" : "Saved" },
      { key: "buyer-matching", label: "AI Matching" },
      { key: "buyer-messages", label: locale === "ja" ? "メッセージ" : "Messages" },
      { key: "buyer-projects", label: locale === "ja" ? "過去案件" : "Projects" }
    ];
    const vendorSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "vendor-overview", label: locale === "ja" ? "概要" : "Overview" },
      { key: "vendor-profile", label: locale === "ja" ? "公開プロフィール" : "Public Profile" },
      { key: "vendor-messages", label: locale === "ja" ? "問い合わせ" : "Inbox" },
      { key: "vendor-projects", label: locale === "ja" ? "実績" : "Portfolio" },
      { key: "vendor-billing", label: locale === "ja" ? "請求" : "Billing" }
    ];
    if (sessionRole === "buyer") return buyerSections;
    if (sessionRole === "vendor") return vendorSections;
    return guestSections;
  }, [locale, sessionRole]);

  const kpis = useMemo(() => {
    const avgRate = companies.length > 0 ? Math.round(companies.reduce((acc, c) => acc + c.minRate, 0) / companies.length) : 0;
    const pendingApps = vendorApplications.filter((app) => app.status === "pending").length;
    const approvedCount = vendorApplications.filter((app) => app.status === "approved").length;

    return [
      { label: locale === "ja" ? "公開開発会社" : "Listed Vendors", value: locale === "ja" ? `${companies.length}社` : `${companies.length}`, icon: BriefcaseBusiness },
      { label: locale === "ja" ? "審査待ち申請" : "Pending Reviews", value: locale === "ja" ? `${pendingApps}社` : `${pendingApps}`, icon: ShieldCheck },
      { label: locale === "ja" ? "承認済み掲載" : "Approved Listings", value: locale === "ja" ? `${approvedCount}社` : `${approvedCount}`, icon: Sparkles },
      { label: locale === "ja" ? "平均開始単価" : "Average Base Rate", value: `$${avgRate}/h`, icon: Wallet }
    ];
  }, [companies, locale, vendorApplications]);

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => {
      const source = `${company.name} ${company.summary} ${company.services.join(" ")} ${company.portfolioProjects
        .map((project) => `${project.title} ${project.projectType} ${project.summary} ${project.businessImpact}`)
        .join(" ")}`.toLowerCase();
      if (query && !source.includes(query.toLowerCase())) return false;
      if (techFilter && !company.services.join(" ").toLowerCase().includes(techFilter)) return false;
      if (projectFilter && !company.portfolioProjects.some((project) => project.projectType === projectFilter)) return false;
      if (rateCap && company.minRate > Number(rateCap)) return false;
      return true;
    });
  }, [companies, projectFilter, query, rateCap, techFilter]);

  const totalMarketplacePages = Math.max(1, Math.ceil(visibleCompanies.length / MARKETPLACE_PAGE_SIZE));
  const favoriteCompanies = useMemo(
    () => companies.filter((company) => favoriteCompanyIds.includes(company.id)),
    [companies, favoriteCompanyIds]
  );
  const pagedVisibleCompanies = useMemo(() => {
    const start = (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE;
    return visibleCompanies.slice(start, start + MARKETPLACE_PAGE_SIZE);
  }, [visibleCompanies, marketplacePage]);

  useEffect(() => {
    setMarketplacePage(1);
  }, [query, techFilter, projectFilter, rateCap]);

  useEffect(() => {
    if (marketplacePage > totalMarketplacePages) {
      setMarketplacePage(totalMarketplacePages);
    }
  }, [marketplacePage, totalMarketplacePages]);

  const matchedResults = useMemo<MatchResult[]>(() => {
    if (!criteria) return [];
    return runTierAwareMatch(companies, criteria, {}, 6);
  }, [companies, criteria]);

  const buyerProjects = useMemo<ProjectHistoryRecord[]>(
    () => (activeBuyer ? SEED_PROJECT_HISTORY.filter((project) => project.buyerOrgId === activeBuyer.id) : []),
    [activeBuyer]
  );

  const vendorProjects = useMemo<ProjectHistoryRecord[]>(
    () => (activeVendorCompany ? SEED_PROJECT_HISTORY.filter((project) => project.vendorCompanyId === activeVendorCompany.id) : []),
    [activeVendorCompany]
  );

  function translatedTextForViewer(message: MessageRecord, target: "ja" | "en" | "company") {
    if (target === "ja") return message.translations.ja;
    if (target === "en") return message.translations.en;
    return message.translations.company;
  }

  function toggleFavoriteCompany(companyId: string) {
    setFavoriteCompanyIds((current) =>
      current.includes(companyId) ? current.filter((id) => id !== companyId) : [...current, companyId]
    );
  }

  async function getDealByThreadForBuyer(threadId: string) {
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/threads/${threadId}/deal`);
    return response.data?.deal ?? null;
  }

  async function getDealByThreadForVendor(threadId: string, vendorCompanyId: string) {
    const response = await readJson<{ deal: DealRecord | null }>(
      `/api/messages/vendor/threads/${threadId}/deal?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    return response.data?.deal ?? null;
  }

  async function handleBuyerDealStatusChange(status: DealStatus) {
    if (!activeThreadId) return;
    const response = await readJson<{ deal: DealRecord }>(`/api/messages/threads/${activeThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok || !response.data) return;
    setActiveBuyerDeal(response.data.deal);
    await buildBuyerThreadOverview(threads);
  }

  async function handleVendorDealStatusChange(status: DealStatus) {
    if (!activeVendorThreadId || !activeVendorCompany) return;
    const response = await readJson<{ deal: DealRecord }>(`/api/messages/vendor/threads/${activeVendorThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, vendorCompanyId: activeVendorCompany.id })
    });
    if (!response.ok || !response.data) return;
    setActiveVendorDeal(response.data.deal);
    await buildVendorThreadOverview(vendorThreads, activeVendorCompany.id);
  }

  async function handleBuyerLogin() {
    const response = await readJson<{ buyer: BuyerOrganization }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: buyerLoginEmail, password: buyerLoginPassword })
    });
    if (!response.ok || !response.data) {
      setBuyerLoginMessage(response.error ?? "ログインに失敗しました。");
      return;
    }

    setActiveBuyer(response.data.buyer);
    setSessionRole("buyer");
    setBuyerLoginMessage("ログインしました。");
    setActiveSection("buyer-overview");
    await refreshThreads();
  }

  async function handleBuyerLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionRole("guest");
    setActiveBuyer(null);
    setThreads([]);
    setActiveThreadId("");
    setThreadMessages([]);
    setBuyerLoginMessage("ログアウトしました。");
    setActiveSection("marketplace");
  }

  function handleVendorLogin() {
    const email = vendorLoginForm.email.trim().toLowerCase();
    const password = vendorLoginForm.password;
    if (!email || !password) {
      setVendorLoginMessage("メールとパスワードを入力してください。");
      return;
    }

    if (email !== VENDOR_DEMO_LOGIN.email || password !== VENDOR_DEMO_LOGIN.password) {
      setVendorLoginMessage("ログイン情報が正しくありません。");
      return;
    }

    const approved = vendorApplications.find((app) => app.status === "approved");
    if (!approved) {
      setVendorLoginMessage("承認済み開発会社データがありません。");
      return;
    }
    setActiveVendorCompany(approved.company);
    setSessionRole("vendor");
    setActiveSection("vendor-overview");
    setVendorLoginMessage("デモ開発会社としてログインしました。");
    void refreshVendorThreads(approved.company.id);
  }

  function handleVendorLogout() {
    setActiveVendorCompany(null);
    setVendorLoginForm(vendorLoginDefaults);
    setVendorThreads([]);
    setActiveVendorThreadId("");
    setVendorThreadMessages([]);
    setVendorThreadInput("");
    setVendorThreadMessageInfo("");
    setVendorProfileMessage("");
    setVendorBilling(null);
    setVendorBillingMessage("");
    setSessionRole("guest");
    setVendorLoginMessage("ログアウトしました。");
    setActiveSection("marketplace");
  }

  async function handleSaveVendorProfile() {
    if (!activeVendorCompany || !vendorProfileForm.summary.trim()) {
      setVendorProfileMessage("会社紹介は必須です。");
      return;
    }
    const response = await readJson<{ company: Company }>(`/api/vendors/companies/${activeVendorCompany.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorProfileForm)
    });
    if (!response.ok || !response.data) {
      setVendorProfileMessage(response.error ?? "更新に失敗しました。");
      return;
    }
    setActiveVendorCompany(response.data.company);
    setCompanies((prev) => prev.map((entry) => (entry.id === response.data!.company.id ? response.data!.company : entry)));
    setVendorProfileMessage("公開プロフィールを更新しました。");
  }

  async function handleTranslateVendorProfile() {
    if (!activeVendorCompany || activeVendorCompany.plan !== "translation") return;
    setProfileTranslationLoading(true);
    setProfileTranslationMessage("");

    const response = await readJson<{ summary: string; portfolioProjects: PortfolioProject[] }>("/api/translate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetLanguage: vendorProfileForm.preferredLanguage,
        summary: vendorProfileForm.summary,
        portfolioProjects: vendorProfileForm.portfolioProjects
      })
    });

    setProfileTranslationLoading(false);
    if (!response.ok || !response.data) {
      setProfileTranslationMessage(response.error ?? "プロフィール翻訳に失敗しました。");
      return;
    }

    setVendorProfileForm((current) => ({
      ...current,
      summary: response.data!.summary,
      portfolioProjects: response.data!.portfolioProjects
    }));
    setProfileTranslationMessage(`${languageLabel(vendorProfileForm.preferredLanguage)} に翻訳してフォームへ反映しました。内容を確認して保存してください。`);
  }

  function updatePortfolioProject(projectId: string, patch: Partial<PortfolioProject>) {
    setVendorProfileForm((current) => ({
      ...current,
      portfolioProjects: current.portfolioProjects.map((project) => (project.id === projectId ? { ...project, ...patch } : project))
    }));
  }

  function addPortfolioProject() {
    setVendorProfileForm((current) => ({
      ...current,
      portfolioProjects: [...current.portfolioProjects, emptyPortfolioProject()]
    }));
  }

  function removePortfolioProject(projectId: string) {
    setVendorProfileForm((current) => ({
      ...current,
      portfolioProjects: current.portfolioProjects.filter((project) => project.id !== projectId)
    }));
  }

  async function handleBillingAction(action: "pause" | "resume" | "cancel") {
    if (!activeVendorCompany) return;
    setBillingActionLoading(action);
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${activeVendorCompany.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    setBillingActionLoading("");
    if (!response.ok || !response.data) {
      setVendorBillingMessage(response.error ?? "請求設定の更新に失敗しました。");
      return;
    }
    setVendorBilling(response.data.billingAccount);
    setVendorBillingMessage(
      action === "pause" ? "請求を一時停止しました。" : action === "resume" ? "請求を再開しました。" : "サブスクリプションを解約しました。"
    );
  }

  async function handleOpenBillingPortal() {
    if (!activeVendorCompany) return;
    const response = await readJson<{ url: string }>(`/api/billing/vendor-account/${activeVendorCompany.id}/portal`, {
      method: "POST"
    });
    if (!response.ok || !response.data?.url) {
      setVendorBillingMessage(response.error ?? "請求ポータルを開けませんでした。");
      return;
    }
    window.location.href = response.data.url;
  }

  async function handleSendChatMessage(raw?: string) {
    const text = (raw ?? chatInput).trim();
    if (!text || !activeBuyer) return;

    setChatMessages((prev) => [...prev, { id: makeId("chat"), role: "user", content: text, createdAt: new Date().toISOString() }]);
    setChatInput("");

    const response = await readJson<{ criteria: BuyerCriteria; matches: MatchResult[]; assistantMessage: string }>(
      "/api/matching/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      }
    );
    const data = response.data;
    if (!response.ok || !data) {
      setChatMessages((prev) => [
        ...prev,
        { id: makeId("chat"), role: "assistant", content: response.error ?? "マッチングに失敗しました。", createdAt: new Date().toISOString() }
      ]);
      return;
    }

    setCriteria(data.criteria);
    setChatMessages((prev) => [
      ...prev,
      { id: makeId("chat"), role: "assistant", content: data.assistantMessage, createdAt: new Date().toISOString() }
    ]);
  }

  function handleResetChat() {
    setCriteria(null);
    setChatInput("");
    setChatMessages([
      {
        id: makeId("chat"),
        role: "assistant",
        content: "新しい相談を開始しました。ご希望の開発要件を入力してください。",
        createdAt: new Date().toISOString()
      }
    ]);
  }

  async function handleStartThread(vendorCompanyId: string) {
    if (!activeBuyer) return;
    const response = await readJson<{ thread: BuyerThread }>("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorCompanyId })
    });
    if (!response.ok || !response.data) {
      setThreadMessageInfo(response.error ?? "スレッド作成に失敗しました。");
      return;
    }
    setThreadMessageInfo("メッセージスレッドを開始しました。");
    await refreshThreads();
    setActiveThreadId(response.data.thread.id);
  }

  async function handleSendThreadMessage() {
    if (!activeThreadId || !threadInput.trim()) return;
    const response = await readJson<{ message: MessageRecord }>(`/api/messages/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: threadInput.trim() })
    });
    if (!response.ok) {
      setThreadMessageInfo(response.error ?? "メッセージ送信に失敗しました。");
      return;
    }
    setThreadInput("");
    setThreadMessageInfo("");
    await refreshThreadMessages(activeThreadId);
  }

  async function handleSendVendorThreadMessage() {
    if (!activeVendorThreadId || !activeVendorCompany || !vendorThreadInput.trim()) return;
    const response = await readJson<{ message: MessageRecord }>(`/api/messages/vendor/threads/${activeVendorThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: vendorThreadInput.trim(), vendorCompanyId: activeVendorCompany.id })
    });
    if (!response.ok) {
      setVendorThreadMessageInfo(response.error ?? "メッセージ送信に失敗しました。");
      return;
    }
    setVendorThreadInput("");
    setVendorThreadMessageInfo("");
    await refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-10 pt-6 md:px-4 xl:px-5">
      <header className="panel mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 py-7 text-white">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold">OFFSHOREMATCH SaaS</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{locale === "ja" ? "日本企業とオフショア開発会社を、確実に結ぶ" : "Connect Japanese companies with offshore development vendors"}</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">{locale === "ja" ? "公開マーケットプレイス、審査付き企業登録、AIマッチング、企業間メッセージを1つに統合。" : "A single product that combines a public marketplace, reviewed vendor listings, AI matching, and company-to-company messaging."}</p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="border-slate-100 bg-slate-50/80 p-3 shadow-none">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{kpi.value}</p>
              </Card>
            );
          })}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[220px,1fr] xl:gap-6">
      <aside className="panel sticky top-3 h-fit border-slate-300 bg-white/95 p-3">
        <nav className="grid gap-2">
          {visibleSections.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                activeSection === item.key
                  ? "border-blue-500 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm"
                  : isPrimaryActionSection(item.key)
                    ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 text-emerald-900 shadow-sm hover:border-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span className="flex items-center gap-2">
                {isPrimaryActionSection(item.key) ? <Sparkles className="h-4 w-4" /> : null}
                <span>{item.label}</span>
              </span>
            </button>
          ))}
        </nav>
        {sessionRole === "buyer" ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-xs font-semibold tracking-[0.14em] text-slate-500">ACCOUNT</p>
            <p className="mt-2 px-1 text-sm font-semibold text-slate-900">{activeBuyer?.companyName}</p>
            <p className="mt-1 px-1 text-xs text-slate-500">{activeBuyer?.email}</p>
            <Button className="mt-3 w-full" variant="ghost" onClick={handleBuyerLogout}>
              {locale === "ja" ? "ログアウト" : "Logout"}
            </Button>
          </div>
        ) : null}
        {sessionRole === "vendor" ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-xs font-semibold tracking-[0.14em] text-slate-500">ACCOUNT</p>
            <p className="mt-2 px-1 text-sm font-semibold text-slate-900">{activeVendorCompany?.name}</p>
            <p className="mt-1 px-1 text-xs text-slate-500">{vendorLoginForm.email}</p>
            <Button className="mt-3 w-full" variant="ghost" onClick={handleVendorLogout}>
              {locale === "ja" ? "ログアウト" : "Logout"}
            </Button>
          </div>
        ) : null}
      </aside>

      <div className="min-w-0">
      <AnimatePresence mode="wait">
        <motion.section
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4"
        >
          {activeSection === "marketplace" ? (
            <>
              <Card>
                <h2 className="section-title">{locale === "ja" ? "公開ディレクトリ（承認済み企業のみ）" : "Public Directory (Reviewed Companies Only)"}</h2>
                <p className="section-subtitle">{locale === "ja" ? "発注企業はログイン不要で比較可能。技術スタックと実績カテゴリを分けて絞り込めます。" : "Buyers can compare vendors without logging in. Filter separately by tech stack and project category."}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={locale === "ja" ? "会社名・実績内容で検索" : "Search company names and project examples"} />
                  <select className="select-field" value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
                    <option value="">{locale === "ja" ? "技術スタック（すべて）" : "Tech Stack (All)"}</option>
                    {TECH_FILTER_OPTIONS.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                  <select className="select-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                    <option value="">{locale === "ja" ? "実績カテゴリ（すべて）" : "Project Category (All)"}</option>
                    {PROJECT_FILTER_OPTIONS.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                  <select className="select-field" value={rateCap} onChange={(e) => setRateCap(e.target.value)}>
                    <option value="">{locale === "ja" ? "単価上限（指定なし）" : "Rate Cap (Any)"}</option>
                    <option value="30">{locale === "ja" ? "$30/h 以下" : "Up to $30/h"}</option>
                    <option value="40">{locale === "ja" ? "$40/h 以下" : "Up to $40/h"}</option>
                    <option value="50">{locale === "ja" ? "$50/h 以下" : "Up to $50/h"}</option>
                  </select>
                </div>
              </Card>
              {favoriteCompanies.length > 0 ? (
                <Card className="overflow-hidden p-0">
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-5 py-4 text-white">
                    <p className="text-xs font-semibold tracking-[0.18em] text-cyan-200">SHORTLIST</p>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">保存した候補会社</h3>
                    <p className="mt-1 text-sm text-slate-300">気になった会社を一時保存し、あとで比較や問い合わせへ進めます。</p>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {favoriteCompanies.slice(0, 3).map((company) => (
                      <div key={company.id} className="grid gap-2">
                        <CompanyCard company={company} locale={locale} />
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => toggleFavoriteCompany(company.id)}>{locale === "ja" ? "保存解除" : "Remove"}</Button>
                          <Button onClick={() => setActiveSection(sessionRole === "buyer" ? "buyer-messages" : "auth")}>{locale === "ja" ? "問い合わせへ" : "Contact"}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {pagedVisibleCompanies.map((company) => (
                  <div key={company.id} className="grid h-full gap-2">
                    <CompanyCard company={company} locale={locale} />
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => toggleFavoriteCompany(company.id)}>
                        {favoriteCompanyIds.includes(company.id) ? (locale === "ja" ? "保存済み" : "Saved") : (locale === "ja" ? "候補に保存" : "Save")}
                      </Button>
                      <Button variant="secondary" onClick={() => setActiveSection(sessionRole === "buyer" ? "buyer-messages" : "auth")}>{locale === "ja" ? "問い合わせへ" : "Contact"}</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  {locale === "ja" ? `${visibleCompanies.length}社中 ` : `${visibleCompanies.length} total, `}
                  {visibleCompanies.length === 0 ? 0 : (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE + 1} -{" "}
                  {Math.min(marketplacePage * MARKETPLACE_PAGE_SIZE, visibleCompanies.length)} {locale === "ja" ? "件を表示" : "shown"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.max(1, p - 1))}
                    disabled={marketplacePage === 1}
                  >
                    {locale === "ja" ? "前へ" : "Prev"}
                  </Button>
                  <span className="text-xs font-semibold text-slate-700">
                    {marketplacePage} / {totalMarketplacePages}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.min(totalMarketplacePages, p + 1))}
                    disabled={marketplacePage >= totalMarketplacePages}
                  >
                    {locale === "ja" ? "次へ" : "Next"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {activeSection === "auth" ? (
            <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
              <Card className="grid h-full content-start gap-4 p-6">
                <h2 className="section-title">{locale === "ja" ? "発注企業ログイン" : "Buyer Login"}</h2>
                <p className="section-subtitle">{locale === "ja" ? "ログイン後、要件チャットとマッチング、企業メッセージが利用できます。" : "After login, buyers can use requirement chat, matching, and company messaging."}</p>
                <div className="grid min-h-[86px] gap-3 sm:grid-cols-2">
                  <Field label={locale === "ja" ? "メール" : "Email"}><Input className="h-11" value={buyerLoginEmail} onChange={(e) => setBuyerLoginEmail(e.target.value)} /></Field>
                  <Field label={locale === "ja" ? "パスワード" : "Password"}><Input className="h-11" type="password" value={buyerLoginPassword} onChange={(e) => setBuyerLoginPassword(e.target.value)} /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleBuyerLogin}>{locale === "ja" ? "発注企業でログイン" : "Login as Buyer"}</Button>
                  <Link href="/app/register/buyer" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {locale === "ja" ? "発注企業として新規登録" : "Register as Buyer"}
                  </Link>
                </div>
                {buyerLoginMessage ? <p className="text-sm text-slate-600">{buyerLoginMessage}</p> : null}
              </Card>

              <Card className="grid h-full content-start gap-4 p-6">
                <h2 className="section-title">{locale === "ja" ? "開発会社ログイン" : "Vendor Login"}</h2>
                <p className="section-subtitle">{locale === "ja" ? "承認済み開発会社がダッシュボードへログインできます。" : "Approved vendors can log into their dashboard."}</p>
                <div className="grid min-h-[86px] gap-3 sm:grid-cols-2">
                  <Field label={locale === "ja" ? "メール" : "Email"}><Input className="h-11" value={vendorLoginForm.email} onChange={(e) => setVendorLoginForm((p) => ({ ...p, email: e.target.value }))} /></Field>
                  <Field label={locale === "ja" ? "パスワード" : "Password"}><Input className="h-11" type="password" value={vendorLoginForm.password} onChange={(e) => setVendorLoginForm((p) => ({ ...p, password: e.target.value }))} /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleVendorLogin}>{locale === "ja" ? "開発会社でログイン" : "Login as Vendor"}</Button>
                  <Link href="/app/register/vendor" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {locale === "ja" ? "開発会社として掲載申請" : "Apply as Vendor"}
                  </Link>
                </div>
                <p className="text-xs text-slate-500">{locale === "ja" ? "デモログイン" : "Demo login"}: {VENDOR_DEMO_LOGIN.email} / {VENDOR_DEMO_LOGIN.password}</p>
                {vendorLoginMessage ? <p className="text-sm text-slate-600">{vendorLoginMessage}</p> : null}
              </Card>
            </div>
          ) : null}

          {activeSection.startsWith("buyer-") ? (
            <Card className="grid gap-4">
              <h2 className="section-title">{locale === "ja" ? "発注企業ワークスペース" : "Buyer Workspace"}</h2>
              {sessionRole !== "buyer" || !activeBuyer ? (
                <Card className="border-blue-100 bg-blue-50 p-6">
                  <p className="text-sm text-slate-700">{locale === "ja" ? "この機能は発注企業ログイン後に利用できます。" : "This area is available after buyer login."}</p>
                  <div className="mt-3"><Button onClick={() => setActiveSection("auth")}>{locale === "ja" ? "ログイン / 登録へ" : "Go to Login / Register"}</Button></div>
                </Card>
              ) : (
                <>
                  {activeSection === "buyer-overview" ? (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                    <Card className="grid gap-4 border-slate-100 bg-white p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "発注企業プロフィール" : "Buyer Profile"}</p>
                          <p className="text-sm text-slate-600">{locale === "ja" ? "保存候補、実績、過去チャットをここから把握できます。" : "Review saved vendors, project history, and recent chats."}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会社名" : "Company"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{activeBuyer.companyName}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "業種" : "Industry"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{activeBuyer.industry}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "保存候補" : "Saved Vendors"}</p>
                          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{favoriteCompanies.length}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "過去案件" : "Projects"}</p>
                          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{buyerProjects.length}</p>
                        </Card>
                      </div>
                    </Card>

                    <Card className="grid gap-3 border-slate-100 bg-slate-950 p-5">
                      <div className="flex items-center gap-2 text-slate-100">
                        <MessageSquareMore className="h-4 w-4" />
                        <p className="text-sm font-semibold">{locale === "ja" ? "最近のチャット概要" : "Recent Chats"}</p>
                      </div>
                      <div className="grid gap-2">
                        {buyerThreadOverview.slice(0, 3).map((thread) => (
                          <div key={thread.threadId} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{thread.counterpartyLabel}</p>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">{dealStatusLabel(thread.status, locale)}</span>
                                <p className="text-[11px] text-slate-400">{new Date(thread.lastMessageAt).toLocaleDateString("ja-JP")}</p>
                              </div>
                            </div>
                            <p className="mt-2 text-xs leading-6 text-slate-300">{thread.lastMessage}</p>
                          </div>
                        ))}
                        {buyerThreadOverview.length === 0 ? <p className="text-xs text-slate-400">{locale === "ja" ? "まだチャット履歴はありません。" : "No chat history yet."}</p> : null}
                      </div>
                    </Card>
                  </div>
                  ) : null}

                  {activeSection === "buyer-overview" ? (
                  <Card className="overflow-hidden border-emerald-200 p-0">
                    <div className="grid gap-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-700 px-6 py-6 text-white lg:grid-cols-[1fr,auto] lg:items-center">
                      <div>
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Matching
                        </p>
                        <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold">{locale === "ja" ? "まずは AI Matching で候補会社を絞り込む" : "Start with AI Matching to shortlist vendors"}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-cyan-50">
                          {locale === "ja" ? "要件を自然文で入力すると、技術・単価・体制をもとに候補会社を整理します。最初にここを使うのが最短です。" : "Describe your needs in natural language and the app will organize candidates by tech, price range, and delivery setup. This is the fastest way to start."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setActiveSection("buyer-matching")}>
                          {locale === "ja" ? "AI Matching を開く" : "Open AI Matching"}
                        </Button>
                        <Button variant="ghost" className="border border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => setActiveSection("marketplace")}>
                          {locale === "ja" ? "マーケットプレイスを見る" : "View Marketplace"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                  ) : null}

                  {activeSection === "buyer-overview" || activeSection === "buyer-saved" || activeSection === "buyer-projects" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <h3 className="font-semibold text-slate-900">{locale === "ja" ? "保存した候補会社" : "Saved Vendors"}</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {favoriteCompanies.slice(0, 4).map((company) => (
                          <div key={company.id} className="grid gap-2">
                            <CompanyCard company={company} locale={locale} />
                            <Button variant="ghost" onClick={() => handleStartThread(company.id)}>{locale === "ja" ? "問い合わせ開始" : "Start Inquiry"}</Button>
                          </div>
                        ))}
                        {favoriteCompanies.length === 0 ? <p className="text-sm text-slate-600">{locale === "ja" ? "マーケットプレイスで候補を保存すると、ここにまとまります。" : "Saved vendors from the marketplace will appear here."}</p> : null}
                      </div>
                    </Card>

                    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-blue-700" />
                        <h3 className="font-semibold text-slate-900">{locale === "ja" ? "過去の発注案件" : "Past Projects"}</h3>
                      </div>
                      <div className="grid gap-3">
                        {buyerProjects.map((project) => (
                          <div key={project.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                              <Badge className={project.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                                {project.status === "completed" ? (locale === "ja" ? "完了" : "Completed") : (locale === "ja" ? "進行中" : "In Progress")}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">{locale === "ja" ? "委託先" : "Vendor"}: {project.vendorCompanyName} / {new Date(project.deliveredAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  ) : null}

                  {activeSection === "buyer-overview" || activeSection === "buyer-matching" ? (
                  <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr] xl:items-stretch">
                    <Card className="grid h-full gap-4 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">AI Matching</h3>
                        <Button variant="ghost" onClick={handleResetChat}>{locale === "ja" ? "新規相談" : "New Session"}</Button>
                      </div>
                      <p className="text-sm text-slate-600">{locale === "ja" ? "要件を自然文で入力すると、候補会社と選定理由をまとめて提示します。" : "Describe your requirements in natural language to get vendor recommendations and matching reasons."}</p>

                      <div className="max-h-[460px] min-h-[260px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-4 md:min-h-[360px]">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-6 ${msg.role === "assistant" ? "bg-blue-50 text-slate-800" : "ml-auto bg-slate-900 text-white"}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => handleSendChatMessage(prompt)}
                            className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>

                      <Field label={locale === "ja" ? "メッセージ入力" : "Requirement Input"}>
                        <Textarea
                          rows={6}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={locale === "ja" ? "例: React + Node.js エンジニア4名、6ヶ月、時給30ドルまで、英語必須" : "Example: Need 4 React + Node.js engineers for 6 months, up to $30/h, English required"}
                        />
                      </Field>
                      <Button onClick={() => handleSendChatMessage()}><Sparkles className="h-4 w-4" />{locale === "ja" ? "送信してマッチ更新" : "Send and Refresh Matches"}</Button>
                    </Card>

                    <div className="grid h-full gap-4">
                      <Card className="border-slate-100 bg-slate-950 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-200">{locale === "ja" ? "抽出要件" : "Extracted Criteria"}</h3>
                        <pre className="overflow-auto text-xs text-slate-100">{JSON.stringify(criteria, null, 2)}</pre>
                      </Card>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {matchedResults.map(({ company, score, reasons }) => (
                          <div key={company.id} className="grid h-full gap-2">
                            <CompanyCard company={company} score={score} locale={locale} />
                            <div className="flex flex-wrap gap-1.5">
                              {reasons.slice(0, 3).map((reason) => (
                                <Badge key={`${company.id}-${reason}`} className="bg-emerald-50 text-emerald-700">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                            <Button variant="ghost" onClick={() => handleStartThread(company.id)}>{locale === "ja" ? "この会社へ問い合わせ" : "Contact This Vendor"}</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {activeSection === "buyer-overview" || activeSection === "buyer-messages" ? (
                  <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                    <h3 className="font-semibold text-slate-900">{locale === "ja" ? "企業メッセージ" : "Messages"}</h3>
                    <div className="grid gap-1.5">
                      <span className="field-label">{locale === "ja" ? "連絡先企業を選択" : "Select Vendor"}</span>
                      <select className="select-field" value={activeThreadId} onChange={(e) => setActiveThreadId(e.target.value)}>
                        <option value="">{locale === "ja" ? "会社を選択" : "Select a company"}</option>
                        {threads.map((thread) => {
                          const vendorName = companies.find((company) => company.id === thread.vendorCompanyId)?.name ?? "Unknown Vendor";
                          return (
                            <option key={thread.id} value={thread.id}>
                              {vendorName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grid gap-1.5 md:max-w-xs">
                      <span className="field-label">{locale === "ja" ? "案件ステータス" : "Project Status"}</span>
                      <select
                        className="select-field"
                        value={activeBuyerDeal?.status ?? "相談中"}
                        onChange={(e) => void handleBuyerDealStatusChange(e.target.value as DealStatus)}
                        disabled={!activeThreadId}
                      >
                        {dealStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {dealStatusLabel(status, locale)}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        {locale === "ja" ? "最終更新" : "Last updated"}: {activeBuyerDeal ? `${activeBuyerDeal.updatedBy === "buyer" ? (locale === "ja" ? "発注企業" : "Buyer") : (locale === "ja" ? "開発会社" : "Vendor")} / ${new Date(activeBuyerDeal.updatedAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}` : (locale === "ja" ? "未設定" : "Not set")}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[220px,1fr]">
                      <div className="max-h-80 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                        {threads.map((thread) => {
                          const vendorName = companies.find((c) => c.id === thread.vendorCompanyId)?.name ?? "Unknown Vendor";
                          return (
                            <button
                              key={thread.id}
                              type="button"
                              onClick={() => setActiveThreadId(thread.id)}
                              className={`w-full rounded-lg px-2 py-2 text-left text-xs font-semibold ${
                                activeThreadId === thread.id ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100"
                              }`}
                            >
                              {vendorName}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.plan ?? "basic") === "translation"
                            ? (locale === "ja" ? `この開発会社は翻訳付きプランです。原文と ${languageLabel(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.preferredLanguage)} 翻訳を表示します。` : `This vendor uses the translation plan. The chat shows original text plus ${languageLabel(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.preferredLanguage)} translation.`)
                            : (locale === "ja" ? "このチャットは原文表示です。" : "This chat shows original text only.")}
                        </div>
                        <div className="max-h-[420px] min-h-[220px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[300px]">
                          {threadMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                                msg.sender === "buyer" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                              {(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.plan ?? "basic") === "translation" &&
                              translatedTextForViewer(msg, msg.sender === "buyer" ? "company" : "ja") &&
                              translatedTextForViewer(msg, msg.sender === "buyer" ? "company" : "ja") !== msg.body ? (
                                <div className={`mt-2 rounded-md px-2 py-2 text-xs ${msg.sender === "buyer" ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}>
                                  <p className="mb-1 font-semibold">{msg.sender === "buyer" ? languageLabel(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.preferredLanguage) : (locale === "ja" ? "日本語" : "Japanese")} {locale === "ja" ? "訳" : "translation"}</p>
                                  <p className="whitespace-pre-wrap">{translatedTextForViewer(msg, msg.sender === "buyer" ? "company" : "ja")}</p>
                                </div>
                              ) : null}
                              <p className={`mt-1 text-[10px] ${msg.sender === "buyer" ? "text-slate-300" : "text-slate-500"}`}>
                                {locale === "ja" ? "原文" : "Original"}: {msg.originalLanguage.toUpperCase()}
                              </p>
                            </div>
                          ))}
                          {threadMessages.length === 0 ? <p className="text-xs text-slate-500">{locale === "ja" ? "スレッドを選択してメッセージを開始してください。" : "Select a thread to start messaging."}</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <Input className="min-w-0" value={threadInput} onChange={(e) => setThreadInput(e.target.value)} placeholder={locale === "ja" ? "メッセージを入力" : "Enter a message"} />
                          <Button className="min-w-20 shrink-0 whitespace-nowrap" onClick={handleSendThreadMessage}>{locale === "ja" ? "送信" : "Send"}</Button>
                        </div>
                        {threadMessageInfo ? <p className="text-xs text-slate-600">{threadMessageInfo}</p> : null}
                      </div>
                    </div>
                  </Card>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          {activeSection.startsWith("vendor-") ? (
            <div className="grid gap-4">
              <Card className="grid gap-4">
                <h2 className="section-title">{locale === "ja" ? "開発会社ワークスペース" : "Vendor Workspace"}</h2>
                {sessionRole !== "vendor" || !activeVendorCompany ? (
                  <Card className="border-blue-100 bg-blue-50 p-6">
                    <p className="text-sm text-slate-700">{locale === "ja" ? "この機能は開発会社ログイン後に利用できます。" : "This area is available after vendor login."}</p>
                    <div className="mt-3"><Button onClick={() => setActiveSection("auth")}>{locale === "ja" ? "ログイン / 登録へ" : "Go to Login / Register"}</Button></div>
                  </Card>
                ) : (
                  <>
                {activeSection === "vendor-overview" ? (
                <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                  <Card className="grid gap-4 border-slate-100 bg-white p-5 shadow-none">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "開発会社プロフィールダッシュボード" : "Vendor Profile Dashboard"}</p>
                        <p className="text-sm text-slate-600">{locale === "ja" ? "掲載状態、受注実績、過去チャット、請求状況を横断して確認できます。" : "Review listing status, delivery history, past chats, and billing in one place."}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "国" : "Country"}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{activeVendorCompany.country}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "サービス数" : "Services"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{activeVendorCompany.services.length}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "過去案件" : "Projects"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{vendorProjects.length}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会話中スレッド" : "Active Threads"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{vendorThreads.length}</p>
                      </Card>
                    </div>
                  </Card>

                  <Card className="grid gap-3 border-slate-100 bg-slate-950 p-5 shadow-none">
                    <div className="flex items-center gap-2 text-slate-100">
                      <MessageSquareMore className="h-4 w-4" />
                      <p className="text-sm font-semibold">{locale === "ja" ? "過去チャット概要" : "Recent Chats"}</p>
                    </div>
                    <div className="grid gap-2">
                      {vendorThreadOverview.slice(0, 3).map((thread) => (
                        <div key={thread.threadId} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{thread.counterpartyLabel}</p>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">{dealStatusLabel(thread.status, locale)}</span>
                              <p className="text-[11px] text-slate-400">{new Date(thread.lastMessageAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-300">{thread.lastMessage}</p>
                        </div>
                      ))}
                      {vendorThreadOverview.length === 0 ? <p className="text-xs text-slate-400">{locale === "ja" ? "まだ問い合わせ履歴はありません。" : "No inquiry history yet."}</p> : null}
                    </div>
                  </Card>
                </div>
                ) : null}
                {activeSection === "vendor-overview" ? (
                <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
                  <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">掲載プラン</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{planLabel(activeVendorCompany.plan)}</p>
                    <p className="mt-1 text-sm text-slate-600">{monthlyPriceLabel(activeVendorCompany.plan)} で会社情報を掲載できます。</p>
                  </Card>
                  <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">翻訳設定</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {activeVendorCompany.plan === "translation"
                        ? `優先言語 ${languageLabel(activeVendorCompany.preferredLanguage)} にチャット翻訳を表示できます。`
                        : "ベーシックでは通常チャットのみ利用できます。"}
                    </p>
                  </Card>
                </div>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-profile" ? (
                <Card className="border-slate-100 bg-white p-4 shadow-none">
                  <p className="text-sm font-semibold text-slate-900">公開中プロフィール（編集）</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="WebサイトURL">
                      <Input
                        value={vendorProfileForm.websiteUrl}
                        onChange={(e) => setVendorProfileForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </Field>
                    <Field label="公開メール">
                      <Input
                        value={vendorProfileForm.publicContactEmail}
                        onChange={(e) => setVendorProfileForm((p) => ({ ...p, publicContactEmail: e.target.value }))}
                        placeholder="sales@company.com"
                      />
                    </Field>
                    <Field label="公開電話">
                      <Input
                        value={vendorProfileForm.publicContactPhone}
                        onChange={(e) => setVendorProfileForm((p) => ({ ...p, publicContactPhone: e.target.value }))}
                        placeholder="+81-3-xxxx-xxxx"
                      />
                    </Field>
                    <Field label="チャット優先言語">
                      <select
                        className="select-field"
                        value={vendorProfileForm.preferredLanguage}
                        onChange={(e) => setVendorProfileForm((p) => ({ ...p, preferredLanguage: e.target.value as VendorPreferredLanguage }))}
                      >
                        <option value="en">English</option>
                        <option value="ja">Japanese</option>
                        <option value="vi">Vietnamese</option>
                        <option value="id">Indonesian</option>
                        <option value="th">Thai</option>
                        <option value="pl">Polish</option>
                        <option value="ro">Romanian</option>
                        <option value="ko">Korean</option>
                        <option value="hi">Hindi</option>
                        <option value="uk">Ukrainian</option>
                        <option value="et">Estonian</option>
                        <option value="es">Spanish</option>
                        <option value="ms">Malay</option>
                        <option value="tl">Tagalog</option>
                      </select>
                    </Field>
                  </div>
                  <p className="text-xs text-slate-500">翻訳付きプランでは、この設定言語を基準にプロフィール翻訳とチャット翻訳を行います。</p>
                  <Field label="会社紹介">
                    <Textarea rows={4} value={vendorProfileForm.summary} onChange={(e) => setVendorProfileForm((p) => ({ ...p, summary: e.target.value }))} />
                  </Field>
                  {activeVendorCompany.plan === "translation" ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">プロフィール翻訳</p>
                        <p className="mt-1 text-sm text-slate-600">現在の会社紹介とポートフォリオ文面を、設定済みの会社言語へ翻訳してフォームへ反映します。</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">翻訳付きプラン</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                          翻訳先: <span className="font-semibold text-slate-900">{languageLabel(vendorProfileForm.preferredLanguage)}</span>
                        </div>
                        <Button onClick={handleTranslateVendorProfile} disabled={profileTranslationLoading}>
                          {profileTranslationLoading ? "翻訳中..." : "この内容を翻訳"}
                        </Button>
                      </div>
                      {profileTranslationMessage ? <p className="mt-3 text-sm text-slate-700">{profileTranslationMessage}</p> : null}
                    </div>
                  ) : null}
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">ポートフォリオ実績</p>
                        <p className="text-sm text-slate-600">非技術者にも伝わるよう、作ったもの・期間・予算・成果を整理して掲載します。</p>
                      </div>
                      <Button variant="ghost" onClick={addPortfolioProject}>実績を追加</Button>
                    </div>
                    <div className="grid gap-4">
                      {vendorProfileForm.portfolioProjects.map((project) => (
                        <Card key={project.id} className="grid gap-3 border-slate-200 bg-slate-50 p-4 shadow-none">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{project.title || "新しい実績"}</p>
                            <Button variant="ghost" onClick={() => removePortfolioProject(project.id)}>削除</Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="案件名">
                              <Input value={project.title} onChange={(e) => updatePortfolioProject(project.id, { title: e.target.value })} />
                            </Field>
                            <Field label="実績カテゴリ">
                              <select className="select-field" value={project.projectType} onChange={(e) => updatePortfolioProject(project.id, { projectType: e.target.value as PortfolioProject["projectType"] })}>
                                {PROJECT_FILTER_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="期間">
                              <Input value={project.durationLabel} onChange={(e) => updatePortfolioProject(project.id, { durationLabel: e.target.value })} placeholder="例: 4ヶ月" />
                            </Field>
                            <Field label="予算目安">
                              <Input value={project.budgetLabel} onChange={(e) => updatePortfolioProject(project.id, { budgetLabel: e.target.value })} placeholder="例: 300万〜500万円" />
                            </Field>
                          </div>
                          <Field label="案件概要">
                            <Textarea rows={3} value={project.summary} onChange={(e) => updatePortfolioProject(project.id, { summary: e.target.value })} />
                          </Field>
                          <Field label="技術スタック（カンマ区切り）">
                            <Input
                              value={project.technologies.join(", ")}
                              onChange={(e) => updatePortfolioProject(project.id, {
                                technologies: e.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                              })}
                            />
                          </Field>
                          <Field label="成果 / ビジネス効果">
                            <Textarea rows={2} value={project.businessImpact} onChange={(e) => updatePortfolioProject(project.id, { businessImpact: e.target.value })} />
                          </Field>
                        </Card>
                      ))}
                      {vendorProfileForm.portfolioProjects.length === 0 ? (
                        <p className="text-sm text-slate-600">まずは代表的な案件を2〜3件登録すると、発注企業が比較しやすくなります。</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleSaveVendorProfile}>プロフィールを保存</Button>
                    <Link href={`/companies/${activeVendorCompany.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      公開ページを確認
                    </Link>
                  </div>
                  {vendorProfileMessage ? <p className="text-sm text-slate-700">{vendorProfileMessage}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {activeVendorCompany.services.map((service) => (
                      <Badge key={service}>{service}</Badge>
                    ))}
                  </div>
                </Card>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-billing" ? (
                <Card className="grid gap-4 border-slate-100 bg-white p-5 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">アカウントと請求</p>
                      <p className="mt-1 text-sm text-slate-600">月額掲載料、契約状態、請求操作を管理します。</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">
                      {vendorBilling?.status === "active"
                        ? "稼働中"
                        : vendorBilling?.status === "paused"
                          ? "停止中"
                          : vendorBilling?.status === "canceled"
                            ? "解約済み"
                            : "決済待ち"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3 md:items-stretch">
                    <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold text-slate-500">月額料金</p>
                      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{vendorBilling ? `¥${vendorBilling.monthlyPriceJpy.toLocaleString("ja-JP")}` : monthlyPriceLabel(activeVendorCompany.plan).replace("/月", "")}</p>
                    </Card>
                    <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold text-slate-500">請求先メール</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{vendorBilling?.contactEmail ?? vendorLoginForm.email}</p>
                    </Card>
                    <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold text-slate-500">翻訳機能</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {vendorBilling?.translationEnabled ? `有効 (${languageLabel(activeVendorCompany.preferredLanguage)})` : "無効"}
                      </p>
                    </Card>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p>規約同意日時: {vendorBilling?.termsAcceptedAt ? new Date(vendorBilling.termsAcceptedAt).toLocaleString("ja-JP") : "未記録"}</p>
                    <p className="mt-1">操作: 一時停止は掲載課金を止め、再開で復帰します。解約後は再契約が必要です。</p>
                    <p className="mt-1">{vendorBilling?.translationEnabled ? "翻訳付きプランでは、送信メッセージの原文と翻訳文を相手側に表示できます。" : "翻訳を使う場合は翻訳付きプランに変更してください。"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-blue-700">
                      <Link href="/legal/terms" className="underline underline-offset-2">利用規約</Link>
                      <Link href="/legal/privacy" className="underline underline-offset-2">プライバシー</Link>
                      <Link href="/legal/commercial-transactions" className="underline underline-offset-2">販売条件</Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={handleOpenBillingPortal}>請求ポータル</Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleBillingAction(vendorBilling?.status === "paused" ? "resume" : "pause")}
                      disabled={!vendorBilling || billingActionLoading === "pause" || billingActionLoading === "resume" || vendorBilling.status === "canceled"}
                    >
                      {billingActionLoading === "pause" || billingActionLoading === "resume"
                        ? "更新中..."
                        : vendorBilling?.status === "paused"
                          ? "掲載を再開"
                          : "1ヶ月停止"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleBillingAction("cancel")}
                      disabled={!vendorBilling || billingActionLoading === "cancel" || vendorBilling?.status === "canceled"}
                    >
                      {billingActionLoading === "cancel" ? "解約処理中..." : "解約する"}
                    </Button>
                  </div>
                  {vendorBillingMessage ? <p className="text-sm text-slate-700">{vendorBillingMessage}</p> : null}
                </Card>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-projects" ? (
                <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-blue-700" />
                    <h3 className="font-semibold text-slate-900">過去の納品案件</h3>
                  </div>
                  <div className="grid gap-3">
                    {vendorProjects.map((project) => (
                      <div key={project.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                          <Badge className={project.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                            {project.status === "completed" ? "完了" : "進行中"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">発注元: {project.buyerOrgName} / {new Date(project.deliveredAt).toLocaleDateString("ja-JP")}</p>
                      </div>
                    ))}
                    {vendorProjects.length === 0 ? <p className="text-sm text-slate-600">まだ実績データはありません。</p> : null}
                  </div>
                </Card>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-messages" ? (
                <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">発注企業とのメッセージ</h3>
                  <div className="grid gap-1.5">
                    <span className="field-label">連絡中の発注企業を選択</span>
                    <select className="select-field" value={activeVendorThreadId} onChange={(e) => setActiveVendorThreadId(e.target.value)}>
                      <option value="">発注企業を選択</option>
                      {vendorThreads.map((thread) => (
                        <option key={thread.id} value={thread.id}>
                          {thread.buyerEmail}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5 md:max-w-xs">
                    <span className="field-label">案件ステータス</span>
                    <select
                      className="select-field"
                      value={activeVendorDeal?.status ?? "相談中"}
                      onChange={(e) => void handleVendorDealStatusChange(e.target.value as DealStatus)}
                      disabled={!activeVendorThreadId}
                    >
                      {dealStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      最終更新: {activeVendorDeal ? `${activeVendorDeal.updatedBy === "buyer" ? "発注企業" : "開発会社"} / ${new Date(activeVendorDeal.updatedAt).toLocaleString("ja-JP")}` : "未設定"}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[240px,1fr]">
                    <div className="max-h-80 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                      {vendorThreads.map((thread) => (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => setActiveVendorThreadId(thread.id)}
                          className={`w-full rounded-lg px-2 py-2 text-left text-xs font-semibold ${
                            activeVendorThreadId === thread.id ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100"
                          }`}
                        >
                          {thread.buyerEmail}
                        </button>
                      ))}
                      {vendorThreads.length === 0 ? <p className="px-2 py-1 text-xs text-slate-500">まだ問い合わせはありません。</p> : null}
                    </div>

                    <div className="grid gap-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {vendorBilling?.translationEnabled
                          ? `翻訳付きプランが有効です。原文と ${languageLabel(activeVendorCompany.preferredLanguage)} / 日本語の翻訳表示を行います。`
                          : "このチャットは原文表示です。"}
                      </div>
                      <div className="max-h-[420px] min-h-[220px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[300px]">
                        {vendorThreadMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                              msg.sender === "vendor" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                            {vendorBilling?.translationEnabled && translatedTextForViewer(msg, msg.sender === "vendor" ? "ja" : "company") && translatedTextForViewer(msg, msg.sender === "vendor" ? "ja" : "company") !== msg.body ? (
                              <div className={`mt-2 rounded-md px-2 py-2 text-xs ${msg.sender === "vendor" ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}>
                                <p className="mb-1 font-semibold">{msg.sender === "vendor" ? "日本語" : `${languageLabel(activeVendorCompany.preferredLanguage)}訳`}</p>
                                <p className="whitespace-pre-wrap">{translatedTextForViewer(msg, msg.sender === "vendor" ? "ja" : "company")}</p>
                              </div>
                            ) : null}
                            <p className={`mt-1 text-[10px] ${msg.sender === "vendor" ? "text-slate-300" : "text-slate-500"}`}>
                              原文: {msg.originalLanguage.toUpperCase()}
                            </p>
                          </div>
                        ))}
                        {vendorThreadMessages.length === 0 ? <p className="text-xs text-slate-500">スレッドを選択して返信できます。</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <Input className="min-w-0" value={vendorThreadInput} onChange={(e) => setVendorThreadInput(e.target.value)} placeholder="返信メッセージを入力" />
                        <Button className="min-w-20 shrink-0 whitespace-nowrap" onClick={handleSendVendorThreadMessage}>送信</Button>
                      </div>
                      {vendorThreadMessageInfo ? <p className="text-xs text-slate-600">{vendorThreadMessageInfo}</p> : null}
                    </div>
                  </div>
                </Card>
                ) : null}
                </>
                )}
              </Card>
            </div>
          ) : null}

        </motion.section>
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
