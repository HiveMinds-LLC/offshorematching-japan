"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Languages, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_COMPANIES, SEED_VENDOR_APPLICATIONS } from "@/lib/data/mockData";
import { TECH_FILTER_OPTIONS } from "@/lib/domain/service-catalog";
import type { BuyerCriteria, BuyerOrganization, Company, VendorApplication } from "@/lib/domain/types";
import { runTierAwareMatch } from "@/lib/matching";

const tabs = [
  { key: "marketplace", label: "マーケットプレイス" },
  { key: "auth", label: "ログイン" },
  { key: "buyer", label: "発注企業" },
  { key: "vendor", label: "開発会社" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
type SessionRole = "guest" | "buyer" | "vendor";

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

type ThreadMessage = {
  id: string;
  threadId: string;
  sender: "buyer" | "vendor";
  body: string;
  createdAt: string;
};

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function CompanyCard({ company, score }: { company: Company; score?: number }) {
  const projectScale = company.teamSize >= 100 ? "大規模案件" : company.teamSize >= 30 ? "中規模案件" : "小〜中規模案件";

  return (
    <Link href={`/companies/${company.id}`} className="block transition hover:-translate-y-0.5">
      <Card className="grid gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900">{company.name}</h4>
            <p className="mt-0.5 text-xs font-semibold text-blue-700">掲載プラン: ベーシック（¥5,000/月）</p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-700">{company.summary}</p>

        <div className="flex flex-wrap gap-1.5">
          {company.services.slice(0, 4).map((service) => (
            <Badge key={service}>{service}</Badge>
          ))}
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-500" />
            単価目安: <span className="font-semibold text-slate-900">${company.minRate}-${company.maxRate}/h</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {company.country} | {company.teamSize}名 | {projectScale}
          </p>
          <p className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            英語 {levelLabel(company.english)} / 日本語 {levelLabel(company.japaneseSupport)}
          </p>
        </div>

        <p className="text-xs font-semibold text-blue-700 underline underline-offset-2">会社プロフィールを見る</p>
        {typeof score === "number" ? <p className="text-xs font-semibold text-emerald-700">マッチスコア: {score.toFixed(1)}</p> : null}
      </Card>
    </Link>
  );
}

export function OffshoreMatchApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("marketplace");
  const [sessionRole, setSessionRole] = useState<SessionRole>("guest");
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>(SEED_VENDOR_APPLICATIONS);

  const [query, setQuery] = useState("");
  const [techFilter, setTechFilter] = useState("");
  const [rateCap, setRateCap] = useState("");
  const [marketplacePage, setMarketplacePage] = useState(1);

  const [vendorLoginForm, setVendorLoginForm] = useState<VendorLoginForm>(vendorLoginDefaults);
  const [vendorLoginMessage, setVendorLoginMessage] = useState("");
  const [activeVendorCompany, setActiveVendorCompany] = useState<Company | null>(null);
  const [vendorProfileForm, setVendorProfileForm] = useState({
    websiteUrl: "",
    publicContactEmail: "",
    publicContactPhone: "",
    summary: ""
  });
  const [vendorProfileMessage, setVendorProfileMessage] = useState("");

  const [buyerLoginEmail, setBuyerLoginEmail] = useState("buyer@example.jp");
  const [buyerLoginPassword, setBuyerLoginPassword] = useState("demo1234");
  const [buyerLoginMessage, setBuyerLoginMessage] = useState("");
  const [activeBuyer, setActiveBuyer] = useState<BuyerOrganization | null>(null);
  const [threads, setThreads] = useState<BuyerThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadInput, setThreadInput] = useState("");
  const [threadMessageInfo, setThreadMessageInfo] = useState("");
  const [vendorThreads, setVendorThreads] = useState<BuyerThread[]>([]);
  const [activeVendorThreadId, setActiveVendorThreadId] = useState("");
  const [vendorThreadMessages, setVendorThreadMessages] = useState<ThreadMessage[]>([]);
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
    const response = await readJson<{ messages: ThreadMessage[] }>(`/api/messages/threads/${threadId}/messages`);
    if (!response.ok || !response.data) return;
    setThreadMessages(response.data.messages);
  }

  async function refreshVendorThreads(vendorCompanyId: string) {
    const response = await readJson<{ threads: BuyerThread[] }>(
      `/api/messages/vendor/threads?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    if (!response.ok || !response.data) return;
    setVendorThreads(response.data.threads);
    setActiveVendorThreadId((current) => current || response.data!.threads[0]?.id || "");
  }

  async function refreshVendorThreadMessages(threadId: string, vendorCompanyId: string) {
    if (!threadId || !vendorCompanyId) return;
    const response = await readJson<{ messages: ThreadMessage[] }>(
      `/api/messages/vendor/threads/${threadId}/messages?vendorCompanyId=${encodeURIComponent(vendorCompanyId)}`
    );
    if (!response.ok || !response.data) return;
    setVendorThreadMessages(response.data.messages);
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([refreshCompanies(), refreshApplications(), refreshSession()]);
    })();
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      setThreadMessages([]);
      return;
    }
    void refreshThreadMessages(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeVendorThreadId || !activeVendorCompany) {
      setVendorThreadMessages([]);
      return;
    }
    void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
  }, [activeVendorThreadId, activeVendorCompany]);

  useEffect(() => {
    if (activeBuyer && activeTab === "auth") {
      setActiveTab("marketplace");
    }
  }, [activeBuyer, activeTab]);

  useEffect(() => {
    if (!activeVendorCompany) {
      setVendorProfileForm({ websiteUrl: "", publicContactEmail: "", publicContactPhone: "", summary: "" });
      return;
    }
    setVendorProfileForm({
      websiteUrl: activeVendorCompany.websiteUrl ?? "",
      publicContactEmail: activeVendorCompany.publicContactEmail ?? "",
      publicContactPhone: activeVendorCompany.publicContactPhone ?? "",
      summary: activeVendorCompany.summary
    });
  }, [activeVendorCompany]);

  const visibleTabs = useMemo(() => {
    if (sessionRole === "buyer") return tabs.filter((tab) => tab.key !== "auth" && tab.key !== "vendor");
    if (sessionRole === "vendor") return tabs.filter((tab) => tab.key !== "auth" && tab.key !== "buyer");
    return tabs.filter((tab) => tab.key === "marketplace" || tab.key === "auth");
  }, [sessionRole]);

  const kpis = useMemo(() => {
    const avgRate = companies.length > 0 ? Math.round(companies.reduce((acc, c) => acc + c.minRate, 0) / companies.length) : 0;
    const pendingApps = vendorApplications.filter((app) => app.status === "pending").length;
    const approvedCount = vendorApplications.filter((app) => app.status === "approved").length;

    return [
      { label: "公開開発会社", value: `${companies.length}社`, icon: BriefcaseBusiness },
      { label: "審査待ち申請", value: `${pendingApps}社`, icon: ShieldCheck },
      { label: "承認済み掲載", value: `${approvedCount}社`, icon: Sparkles },
      { label: "平均開始単価", value: `$${avgRate}/h`, icon: Wallet }
    ];
  }, [companies, vendorApplications]);

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => {
      const source = `${company.name} ${company.summary} ${company.services.join(" ")}`.toLowerCase();
      if (query && !source.includes(query.toLowerCase())) return false;
      if (techFilter && !company.services.join(" ").toLowerCase().includes(techFilter)) return false;
      if (rateCap && company.minRate > Number(rateCap)) return false;
      return true;
    });
  }, [companies, query, rateCap, techFilter]);

  const totalMarketplacePages = Math.max(1, Math.ceil(visibleCompanies.length / MARKETPLACE_PAGE_SIZE));
  const pagedVisibleCompanies = useMemo(() => {
    const start = (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE;
    return visibleCompanies.slice(start, start + MARKETPLACE_PAGE_SIZE);
  }, [visibleCompanies, marketplacePage]);

  useEffect(() => {
    setMarketplacePage(1);
  }, [query, techFilter, rateCap]);

  useEffect(() => {
    if (marketplacePage > totalMarketplacePages) {
      setMarketplacePage(totalMarketplacePages);
    }
  }, [marketplacePage, totalMarketplacePages]);

  const matchedResults = useMemo(() => {
    if (!criteria) return [];
    return runTierAwareMatch(companies, criteria, {}, 6);
  }, [companies, criteria]);

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
    setActiveTab("buyer");
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
    setActiveTab("marketplace");
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
    setActiveTab("vendor");
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
    setSessionRole("guest");
    setVendorLoginMessage("ログアウトしました。");
    setActiveTab("marketplace");
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

  async function handleSendChatMessage(raw?: string) {
    const text = (raw ?? chatInput).trim();
    if (!text || !activeBuyer) return;

    setChatMessages((prev) => [...prev, { id: makeId("chat"), role: "user", content: text, createdAt: new Date().toISOString() }]);
    setChatInput("");

    const response = await readJson<{ criteria: BuyerCriteria; matches: Array<{ company: Company; score: number }>; assistantMessage: string }>(
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
    const response = await readJson<{ message: ThreadMessage }>(`/api/messages/threads/${activeThreadId}/messages`, {
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
    const response = await readJson<{ message: ThreadMessage }>(`/api/messages/vendor/threads/${activeVendorThreadId}/messages`, {
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
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
      <header className="panel mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 py-7 text-white">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold">OFFSHOREMATCH SaaS</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">日本企業とオフショア開発会社を、確実に結ぶ</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">公開マーケットプレイス、審査付き企業登録、AIマッチング、企業間メッセージを1つに統合。</p>
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

      <nav className="panel sticky top-3 z-30 mb-5 grid gap-2 border-slate-300 bg-white/95 p-2 sm:grid-cols-2 lg:grid-cols-4 xl:gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-12 rounded-xl border text-sm font-bold transition ${
              activeTab === tab.key
                ? "border-blue-500 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4"
        >
          {activeTab === "marketplace" ? (
            <>
              <Card>
                <h2 className="section-title">公開ディレクトリ（承認済み企業のみ）</h2>
                <p className="section-subtitle">発注企業はログイン不要で比較可能。技術・単価で絞り込めます。</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="会社名・技術で検索" />
                  <select className="select-field" value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
                    <option value="">技術スタック（すべて）</option>
                    {TECH_FILTER_OPTIONS.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                  <select className="select-field" value={rateCap} onChange={(e) => setRateCap(e.target.value)}>
                    <option value="">単価上限（指定なし）</option>
                    <option value="30">$30/h 以下</option>
                    <option value="40">$40/h 以下</option>
                    <option value="50">$50/h 以下</option>
                  </select>
                </div>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pagedVisibleCompanies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  {visibleCompanies.length}社中{" "}
                  {visibleCompanies.length === 0 ? 0 : (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE + 1} -{" "}
                  {Math.min(marketplacePage * MARKETPLACE_PAGE_SIZE, visibleCompanies.length)}件を表示
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.max(1, p - 1))}
                    disabled={marketplacePage === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-xs font-semibold text-slate-700">
                    {marketplacePage} / {totalMarketplacePages}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.min(totalMarketplacePages, p + 1))}
                    disabled={marketplacePage >= totalMarketplacePages}
                  >
                    次へ
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "auth" ? (
            <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
              <Card className="grid content-start gap-4 p-6">
                <h2 className="section-title">発注企業ログイン</h2>
                <p className="section-subtitle">ログイン後、要件チャットとマッチング、企業メッセージが利用できます。</p>
                <div className="grid min-h-[86px] gap-3 sm:grid-cols-2">
                  <Field label="メール"><Input className="h-11" value={buyerLoginEmail} onChange={(e) => setBuyerLoginEmail(e.target.value)} /></Field>
                  <Field label="パスワード"><Input className="h-11" type="password" value={buyerLoginPassword} onChange={(e) => setBuyerLoginPassword(e.target.value)} /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleBuyerLogin}>発注企業でログイン</Button>
                  <Link href="/app/register/buyer" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    発注企業として新規登録
                  </Link>
                </div>
                {buyerLoginMessage ? <p className="text-sm text-slate-600">{buyerLoginMessage}</p> : null}
              </Card>

              <Card className="grid content-start gap-4 p-6">
                <h2 className="section-title">開発会社ログイン</h2>
                <p className="section-subtitle">承認済み開発会社がダッシュボードへログインできます。</p>
                <div className="grid min-h-[86px] gap-3 sm:grid-cols-2">
                  <Field label="メール"><Input className="h-11" value={vendorLoginForm.email} onChange={(e) => setVendorLoginForm((p) => ({ ...p, email: e.target.value }))} /></Field>
                  <Field label="パスワード"><Input className="h-11" type="password" value={vendorLoginForm.password} onChange={(e) => setVendorLoginForm((p) => ({ ...p, password: e.target.value }))} /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleVendorLogin}>開発会社でログイン</Button>
                  <Link href="/app/register/vendor" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    開発会社として掲載申請
                  </Link>
                </div>
                <p className="text-xs text-slate-500">デモログイン: {VENDOR_DEMO_LOGIN.email} / {VENDOR_DEMO_LOGIN.password}</p>
                {vendorLoginMessage ? <p className="text-sm text-slate-600">{vendorLoginMessage}</p> : null}
              </Card>
            </div>
          ) : null}

          {activeTab === "buyer" ? (
            <Card className="grid gap-4">
              <h2 className="section-title">発注企業ダッシュボード</h2>
              {sessionRole !== "buyer" || !activeBuyer ? (
                <Card className="border-blue-100 bg-blue-50 p-6">
                  <p className="text-sm text-slate-700">この機能は発注企業ログイン後に利用できます。</p>
                  <div className="mt-3"><Button onClick={() => setActiveTab("auth")}>ログイン / 登録へ</Button></div>
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <span>ログイン中: {activeBuyer.companyName} ({activeBuyer.email})</span>
                    <Button variant="secondary" onClick={handleBuyerLogout}>ログアウト</Button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
                    <Card className="grid gap-4 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">AI相談チャット</h3>
                        <Button variant="ghost" onClick={handleResetChat}>新規相談</Button>
                      </div>

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

                      <Field label="メッセージ入力">
                        <Textarea
                          rows={6}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="例: React + Node.js エンジニア4名、6ヶ月、時給30ドルまで、英語必須"
                        />
                      </Field>
                      <Button onClick={() => handleSendChatMessage()}><Sparkles className="h-4 w-4" />送信してマッチ更新</Button>
                    </Card>

                    <div className="grid gap-4">
                      <Card className="h-fit border-slate-100 bg-slate-950 p-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-200">抽出要件</h3>
                        <pre className="overflow-auto text-xs text-slate-100">{JSON.stringify(criteria, null, 2)}</pre>
                      </Card>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {matchedResults.map(({ company, score }) => (
                          <div key={company.id} className="grid gap-2">
                            <CompanyCard company={company} score={score} />
                            <Button variant="ghost" onClick={() => handleStartThread(company.id)}>この会社へ問い合わせ</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                    <h3 className="font-semibold text-slate-900">企業メッセージ</h3>
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
                        <div className="max-h-80 min-h-[180px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[220px]">
                          {threadMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                                msg.sender === "buyer" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                              }`}
                            >
                              {msg.body}
                            </div>
                          ))}
                          {threadMessages.length === 0 ? <p className="text-xs text-slate-500">スレッドを選択してメッセージを開始してください。</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <Input value={threadInput} onChange={(e) => setThreadInput(e.target.value)} placeholder="メッセージを入力" />
                          <Button onClick={handleSendThreadMessage}>送信</Button>
                        </div>
                        {threadMessageInfo ? <p className="text-xs text-slate-600">{threadMessageInfo}</p> : null}
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </Card>
          ) : null}

          {activeTab === "vendor" ? (
            <div className="grid gap-4">
              <Card className="grid gap-4">
                <h2 className="section-title">開発会社ダッシュボード</h2>
                {sessionRole !== "vendor" || !activeVendorCompany ? (
                  <Card className="border-blue-100 bg-blue-50 p-6">
                    <p className="text-sm text-slate-700">この機能は開発会社ログイン後に利用できます。</p>
                    <div className="mt-3"><Button onClick={() => setActiveTab("auth")}>ログイン / 登録へ</Button></div>
                  </Card>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                      <span>ログイン中: {activeVendorCompany.name}</span>
                      <Button variant="secondary" onClick={handleVendorLogout}>ログアウト</Button>
                    </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">掲載プラン</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">ベーシック</p>
                    <p className="mt-1 text-sm text-slate-600">月額 ¥5,000 で会社情報を掲載できます。</p>
                  </Card>
                  <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">審査フロー</p>
                    <p className="mt-1 text-sm text-slate-700">新規申請後、管理者が承認または却下します。承認後に公開ディレクトリへ掲載されます。</p>
                  </Card>
                </div>
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
                  </div>
                  <Field label="会社紹介">
                    <Textarea rows={4} value={vendorProfileForm.summary} onChange={(e) => setVendorProfileForm((p) => ({ ...p, summary: e.target.value }))} />
                  </Field>
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
                <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">発注企業とのメッセージ</h3>
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
                      <div className="max-h-80 min-h-[180px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[220px]">
                        {vendorThreadMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                              msg.sender === "vendor" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                            }`}
                          >
                            {msg.body}
                          </div>
                        ))}
                        {vendorThreadMessages.length === 0 ? <p className="text-xs text-slate-500">スレッドを選択して返信できます。</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <Input value={vendorThreadInput} onChange={(e) => setVendorThreadInput(e.target.value)} placeholder="返信メッセージを入力" />
                        <Button onClick={handleSendVendorThreadMessage}>送信</Button>
                      </div>
                      {vendorThreadMessageInfo ? <p className="text-xs text-slate-600">{vendorThreadMessageInfo}</p> : null}
                    </div>
                  </div>
                </Card>
                </>
                )}
              </Card>
            </div>
          ) : null}

        </motion.section>
      </AnimatePresence>
      </div>

      <footer className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">UI Polish Sprint 完了</p>
        <p className="mt-1">次フェーズでこのUIを維持したまま、実DBと本番認証へ接続可能です。</p>
      </footer>
    </div>
  );
}
