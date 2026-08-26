"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toaster";
import type { AdminBuyerSummary, AdminDashboardSummary, AdminVendorSummary, VendorApplication } from "@/lib/domain/types";

type Locale = "ja" | "en";

function formatDate(value?: string, locale: Locale = "ja") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "ja-JP");
}

function formatDateShort(value?: string, locale: Locale = "ja") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP");
}

function formatYenRateRange(minRate: number, maxRate: number, locale: Locale = "ja") {
  const suffix = locale === "en" ? "/hr" : "/時";
  return `¥${minRate.toLocaleString("ja-JP")}-¥${maxRate.toLocaleString("ja-JP")}${suffix}`;
}

function planLabel(plan: "basic" | "translation", locale: Locale = "ja") {
  if (plan === "translation") return locale === "en" ? "With Translation" : "翻訳付き";
  return locale === "en" ? "Basic" : "ベーシック";
}

function billingBadgeClass(status: AdminVendorSummary["billingStatus"]) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "canceled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function billingStatusLabel(status: AdminVendorSummary["billingStatus"], locale: Locale = "ja") {
  if (status === "active") return locale === "en" ? "Billing Active" : "決済有効";
  if (status === "paused") return locale === "en" ? "Paused" : "一時停止";
  if (status === "canceled") return locale === "en" ? "Canceled" : "停止済み";
  return locale === "en" ? "Pending" : "決済待ち";
}

function onboardingStatusLabel(status?: string, locale: Locale = "ja") {
  if (status === "approved") return locale === "en" ? "Listed" : "掲載中";
  if (status === "draft") return locale === "en" ? "Draft" : "下書き";
  if (status === "rejected") return locale === "en" ? "Rejected" : "却下";
  if (status === "changes_requested") return locale === "en" ? "Changes Requested" : "修正依頼";
  return status ?? "-";
}

function statusBadgeClass(status?: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "changes_requested") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "draft") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function overviewCards(summary: AdminDashboardSummary, locale: Locale) {
  return [
    {
      label: locale === "en" ? "Buyers" : "発注企業",
      value: locale === "en" ? `${summary.buyerCount} companies` : `${summary.buyerCount}社`,
      hint: locale === "en" ? "Registered clients" : "登録済みのクライアント"
    },
    {
      label: locale === "en" ? "Vendors" : "開発会社",
      value: locale === "en" ? `${summary.vendorCount} companies` : `${summary.vendorCount}社`,
      hint: locale === "en" ? "Registered vendors" : "登録済みベンダー"
    },
    {
      label: locale === "en" ? "Listed" : "掲載中",
      value: locale === "en" ? `${summary.listedVendorCount} companies` : `${summary.listedVendorCount}社`,
      hint: locale === "en" ? "Visible in public directory" : "公開ディレクトリに表示中"
    },
    {
      label: locale === "en" ? "Active Billing" : "決済有効",
      value: locale === "en" ? `${summary.activeBillingCount} companies` : `${summary.activeBillingCount}社`,
      hint: locale === "en" ? "Accounts with active billing" : "有効課金アカウント"
    },
    {
      label: locale === "en" ? "Active Jobs" : "進行中案件",
      value: locale === "en" ? `${summary.activeMatchCount} jobs` : `${summary.activeMatchCount}件`,
      hint: locale === "en" ? "Ongoing projects" : "未完了の案件"
    },
    {
      label: locale === "en" ? "Completed Jobs" : "完了案件",
      value: locale === "en" ? `${summary.completedJobCount} jobs` : `${summary.completedJobCount}件`,
      hint: locale === "en" ? "Platform completed projects" : "プラットフォーム完了実績"
    }
  ];
}

export function AdminReviewPanel({
  initialAdminEmail = null,
  initialApplications = [],
  initialCompanies = [],
  initialBuyers = [],
  initialSummary
}: {
  initialAdminEmail?: string | null;
  initialApplications?: VendorApplication[];
  initialCompanies?: AdminVendorSummary[];
  initialBuyers?: AdminBuyerSummary[];
  initialSummary: AdminDashboardSummary;
}) {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail ?? "");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(Boolean(initialAdminEmail));
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoginAttempted, setAdminLoginAttempted] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [companies, setCompanies] = useState<AdminVendorSummary[]>(initialCompanies);
  const [buyers, setBuyers] = useState<AdminBuyerSummary[]>(initialBuyers);
  const [summary, setSummary] = useState<AdminDashboardSummary>(initialSummary);
  const [applications, setApplications] = useState<VendorApplication[]>(initialApplications);
  const [activeView, setActiveView] = useState<"overview" | "vendors" | "buyers" | "records" | "create">("overview");
  const [vendorSearch, setVendorSearch] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<"all" | "listed" | "unlisted" | "active-billing" | "attention">("all");
  const [moderationLoadingId, setModerationLoadingId] = useState("");
  const [moderationReasons, setModerationReasons] = useState<Record<string, string>>({});
  const [renewalDates, setRenewalDates] = useState<Record<string, string>>({});
  const [renewalLoadingId, setRenewalLoadingId] = useState("");

  const defaultAccessEnd = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [newVendorForm, setNewVendorForm] = useState({ companyName: "", contactName: "", email: "", password: "", plan: "basic" as "basic" | "translation", country: "", accessEndsAt: defaultAccessEnd });
  const [newVendorLoading, setNewVendorLoading] = useState(false);
  const [newVendorMessage, setNewVendorMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newVendorAttempted, setNewVendorAttempted] = useState(false);

  const [newBuyerForm, setNewBuyerForm] = useState({ companyName: "", contactName: "", email: "", password: "", industry: "" });
  const [newBuyerLoading, setNewBuyerLoading] = useState(false);
  const [newBuyerMessage, setNewBuyerMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newBuyerAttempted, setNewBuyerAttempted] = useState(false);

  const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());
  const vendorFieldInvalid = {
    companyName: newVendorAttempted && !newVendorForm.companyName.trim(),
    contactName: newVendorAttempted && !newVendorForm.contactName.trim(),
    email: newVendorAttempted && !isEmail(newVendorForm.email),
    password: newVendorAttempted && newVendorForm.password.length < 8,
    accessEndsAt: newVendorAttempted && (!newVendorForm.accessEndsAt || new Date(newVendorForm.accessEndsAt) <= new Date())
  };
  const buyerFieldInvalid = {
    companyName: newBuyerAttempted && !newBuyerForm.companyName.trim(),
    contactName: newBuyerAttempted && !newBuyerForm.contactName.trim(),
    email: newBuyerAttempted && !isEmail(newBuyerForm.email),
    password: newBuyerAttempted && newBuyerForm.password.length < 8
  };

  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: payload.error ?? (locale === "en" ? "Request failed." : "リクエストに失敗しました。") };
    return { ok: true, data: payload };
  }

  async function loadSummary() {
    const response = await readJson<{ summary: AdminDashboardSummary }>("/api/admin/summary");
    if (!response.ok || !response.data) return;
    setSummary(response.data.summary);
  }

  async function loadBuyers() {
    const response = await readJson<{ buyers: AdminBuyerSummary[] }>("/api/admin/buyers");
    if (!response.ok || !response.data) return;
    setBuyers(response.data.buyers);
  }

  async function loadCompanies() {
    const response = await readJson<{ companies: AdminVendorSummary[] }>("/api/admin/vendors");
    if (!response.ok || !response.data) return;
    setCompanies(response.data.companies);
  }

  async function loadApplications() {
    const response = await readJson<{ applications: VendorApplication[] }>("/api/vendors/applications");
    if (!response.ok || !response.data) return;
    setApplications(response.data.applications);
  }

  async function refreshAll() {
    await Promise.all([loadSummary(), loadBuyers(), loadCompanies(), loadApplications()]);
    toast({ tone: "success", title: locale === "en" ? "Admin data refreshed" : "管理データを更新しました" });
  }

  async function handleRenew(companyId: string) {
    const entry = companies.find((e) => e.company.id === companyId);
    const accessEndsAt = renewalDates[companyId] ?? entry?.currentPeriodEnd?.slice(0, 10);
    if (!accessEndsAt) return;
    setRenewalLoadingId(companyId);
    const response = await readJson<{ billingAccount: unknown }>(`/api/admin/billing/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessEndsAt })
    });
    if (!response.ok) {
      toast({ tone: "error", title: locale === "en" ? "Renewal failed" : "更新に失敗しました", description: response.error });
    } else {
      toast({ tone: "success", title: locale === "en" ? "Access period updated" : "利用期限を更新しました" });
      await loadCompanies();
    }
    setRenewalLoadingId("");
  }

  async function handleCreateVendor() {
    setNewVendorAttempted(true);
    const { companyName, contactName, email, password, plan, country, accessEndsAt } = newVendorForm;
    if (!companyName.trim() || !contactName.trim() || !isEmail(email) || password.length < 8 || !accessEndsAt) {
      setNewVendorMessage({
        ok: false,
        text: locale === "en"
          ? "Fill in all required fields (password must be at least 8 characters)."
          : "すべての必須項目を入力してください（パスワードは8文字以上）。"
      });
      return;
    }
    if (new Date(accessEndsAt) <= new Date()) {
      setNewVendorMessage({
        ok: false,
        text: locale === "en" ? "Access end date must be in the future." : "利用終了日は未来の日付を設定してください。"
      });
      return;
    }
    setNewVendorLoading(true);
    setNewVendorMessage(null);
    const response = await readJson<{ companyId: string }>("/api/admin/create/vendor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, contactName, email, password, plan, country, accessEndsAt })
    });
    if (!response.ok) {
      setNewVendorMessage({ ok: false, text: response.error ?? (locale === "en" ? "Creation failed." : "作成に失敗しました。") });
    } else {
      setNewVendorMessage({
        ok: true,
        text: locale === "en"
          ? `Vendor account created (ID: ${response.data?.companyId ?? ""})`
          : `開発会社アカウントを作成しました（ID: ${response.data?.companyId ?? ""}）`
      });
      setNewVendorForm({ companyName: "", contactName: "", email: "", password: "", plan: "basic", country: "", accessEndsAt: defaultAccessEnd });
      setNewVendorAttempted(false);
      await refreshAll();
    }
    setNewVendorLoading(false);
  }

  async function handleCreateBuyer() {
    setNewBuyerAttempted(true);
    const { companyName, contactName, email, password, industry } = newBuyerForm;
    if (!companyName.trim() || !contactName.trim() || !isEmail(email) || password.length < 8) {
      setNewBuyerMessage({
        ok: false,
        text: locale === "en"
          ? "Fill in all required fields (password must be at least 8 characters)."
          : "すべての必須項目を入力してください（パスワードは8文字以上）。"
      });
      return;
    }
    setNewBuyerLoading(true);
    setNewBuyerMessage(null);
    const response = await readJson<{ buyer: { id: string } }>("/api/admin/create/buyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, contactName, email, password, industry })
    });
    if (!response.ok) {
      setNewBuyerMessage({ ok: false, text: response.error ?? (locale === "en" ? "Creation failed." : "作成に失敗しました。") });
    } else {
      setNewBuyerMessage({ ok: true, text: locale === "en" ? "Client account created" : "クライアントアカウントを作成しました" });
      setNewBuyerForm({ companyName: "", contactName: "", email: "", password: "", industry: "" });
      setNewBuyerAttempted(false);
      await refreshAll();
    }
    setNewBuyerLoading(false);
  }

  async function handleModeration(companyId: string, action: "deactivate" | "reactivate" | "flag" | "remove") {
    setModerationLoadingId(companyId);
    const response = await readJson<{ company: AdminVendorSummary["company"] }>(`/api/admin/vendors/${companyId}/moderation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: moderationReasons[companyId] ?? "" })
    });

    if (!response.ok || !response.data) {
      toast({
        tone: "error",
        title: locale === "en" ? "Moderation update failed" : "会社管理の更新に失敗しました",
        description: response.error ?? (locale === "en" ? "Please try again later." : "時間をおいて再度お試しください。")
      });
      setModerationLoadingId("");
      return;
    }

    setCompanies((current) =>
      current.map((entry) =>
        entry.company.id === companyId
          ? { ...entry, company: { ...entry.company, ...response.data!.company }, listed: Boolean(response.data!.company.active) }
          : entry
      )
    );

    await loadSummary();
    toast({
      tone: "success",
      title:
        action === "deactivate"
          ? (locale === "en" ? "Listing deactivated" : "掲載を停止しました")
          : action === "reactivate"
            ? (locale === "en" ? "Listing reactivated" : "掲載を再開しました")
            : action === "flag"
              ? (locale === "en" ? "Company flagged" : "会社をフラグしました")
              : (locale === "en" ? "Company removed" : "公開停止にしました")
    });
    setModerationLoadingId("");
  }

  async function handleAdminLogin() {
    setAdminLoginAttempted(true);
    if (!isEmail(adminEmail) || !adminPassword) {
      const message = locale === "en" ? "Enter a valid email address and password." : "有効なメールアドレスとパスワードを入力してください。";
      setAdminMessage(message);
      toast({ tone: "error", title: locale === "en" ? "Check your login details" : "入力内容を確認してください", description: message });
      return;
    }
    setLoginLoading(true);
    try {
      const response = await readJson<{ admin: { email: string } }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      if (!response.ok || !response.data) {
        const errorMessage = response.error ?? (locale === "en" ? "Admin login failed." : "管理者ログインに失敗しました。");
        setAdminMessage(errorMessage);
        toast({ tone: "error", title: locale === "en" ? "Admin login failed" : "管理者ログインに失敗しました", description: errorMessage });
        return;
      }

      setAdminLoggedIn(true);
      setAdminEmail(response.data.admin.email);
      setAdminPassword("");
      setAdminMessage("");
      setAdminLoginAttempted(false);
      await refreshAll();
      toast({ tone: "success", title: locale === "en" ? "Logged in as admin" : "管理者としてログインしました" });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleAdminLogout() {
    setLogoutLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminLoggedIn(false);
    setAdminPassword("");
    setCompanies([]);
    setBuyers([]);
    setApplications([]);
    setAdminMessage("");
    toast({ tone: "info", title: locale === "en" ? "Logged out" : "ログアウトしました" });
    setLogoutLoading(false);
  }

  const filteredVendors = useMemo(() => {
    return companies.filter((entry) => {
      const source = `${entry.company.name} ${entry.company.country} ${entry.contactEmail} ${entry.company.services.join(" ")}`.toLowerCase();
      if (vendorSearch && !source.includes(vendorSearch.toLowerCase())) return false;
      if (vendorFilter === "listed" && !entry.listed) return false;
      if (vendorFilter === "unlisted" && entry.listed) return false;
      if (vendorFilter === "active-billing" && entry.billingStatus !== "active") return false;
      if (vendorFilter === "attention") {
        const needsAttention = !entry.listed || entry.billingStatus !== "active" || Boolean(entry.company.flaggedAt) || Boolean(entry.company.removedAt);
        if (!needsAttention) return false;
      }
      return true;
    });
  }, [companies, vendorFilter, vendorSearch]);

  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      const source = `${buyer.companyName} ${buyer.industry} ${buyer.contactName} ${buyer.email}`.toLowerCase();
      return buyerSearch ? source.includes(buyerSearch.toLowerCase()) : true;
    });
  }, [buyers, buyerSearch]);

  const needsAttentionCount = companies.filter((entry) => !entry.listed || entry.billingStatus !== "active" || Boolean(entry.company.flaggedAt) || Boolean(entry.company.removedAt)).length;
  const attentionVendors = useMemo(
    () => companies.filter((entry) => !entry.listed || entry.billingStatus !== "active" || Boolean(entry.company.flaggedAt) || Boolean(entry.company.removedAt)).slice(0, 6),
    [companies]
  );
  const upcomingPlanChanges = useMemo(() => companies.filter((entry) => entry.pendingPlan).slice(0, 6), [companies]);
  const activeBuyers = useMemo(
    () => [...buyers].sort((a, b) => (b.activeProjectCount + b.completedProjectCount) - (a.activeProjectCount + a.completedProjectCount)).slice(0, 6),
    [buyers]
  );

  const t = {
    navTabs: [
      { key: "overview", label: locale === "en" ? "Overview" : "概要" },
      { key: "vendors", label: locale === "en" ? `Vendors ${companies.length}` : `開発会社 ${companies.length}` },
      { key: "buyers", label: locale === "en" ? `Clients ${buyers.length}` : `クライアント ${buyers.length}` },
      { key: "records", label: locale === "en" ? `Records ${applications.length}` : `登録記録 ${applications.length}` },
      { key: "create", label: locale === "en" ? "Create Account" : "アカウント作成" }
    ]
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
      <Card className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white">
          <p className="text-xs font-semibold tracking-wide text-slate-200">ADMIN</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold">
            {locale === "en" ? "OffshoreKaihatsu Admin Dashboard" : "OffshoreKaihatsu 運営ダッシュボード"}
          </h1>
          <p className="mt-2 text-sm text-slate-200">
            {locale === "en"
              ? "Monitor clients, vendors, listing status, and billing in one place. Handle moderation as needed."
              : "クライアント、開発会社、掲載状態、決済状態をまとめて確認し、必要なモデレーションだけを行います。"}
          </p>
        </div>
      </Card>

      {!adminLoggedIn ? (
        <Card className="grid gap-3">
          <h2 className="section-title">{locale === "en" ? "Admin Login" : "管理者ログイン"}</h2>
          <p className="section-subtitle">
            {locale === "en" ? "Log in with an admin account to access the dashboard." : "管理者アカウントでログインし、全体データを確認します。"}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "en" ? "Admin Email" : "管理者メール"}</span>
              <Input required type="email" aria-invalid={adminLoginAttempted && !isEmail(adminEmail)} className={adminLoginAttempted && !isEmail(adminEmail) ? "border-rose-400 bg-rose-50/40" : undefined} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "en" ? "Password" : "パスワード"}</span>
              <PasswordInput required aria-invalid={adminLoginAttempted && !adminPassword} className={adminLoginAttempted && !adminPassword ? "border-rose-400 bg-rose-50/40" : undefined} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </label>
            <div className="self-end">
              <Button className="w-full" onClick={() => void handleAdminLogin()} disabled={loginLoading}>
                {loginLoading ? (locale === "en" ? "Logging in..." : "ログイン中...") : (locale === "en" ? "Log In" : "ログイン")}
              </Button>
            </div>
          </div>
          {adminMessage ? <p className="text-sm font-medium text-rose-600">{adminMessage}</p> : null}
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">{locale === "en" ? "Admin View" : "管理ビュー"}</h2>
                <p className="section-subtitle">buyers: {summary.buyerCount} / vendors: {summary.vendorCount} / attention: {needsAttentionCount}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void refreshAll()}>
                  {locale === "en" ? "Refresh" : "再読み込み"}
                </Button>
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleAdminLogout()} disabled={logoutLoading}>
                  {logoutLoading ? (locale === "en" ? "Logging out..." : "ログアウト中...") : (locale === "en" ? "Log Out" : "ログアウト")}
                </Button>
                <Link href="/app" className="inline-flex whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {locale === "en" ? "Back to App" : "ユーザー画面へ"}
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.navTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveView(item.key as typeof activeView)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === item.key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Card>

          {activeView === "overview" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {overviewCards(summary, locale).map((card) => (
                  <Card key={card.label} className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                    <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">{card.value}</p>
                    <p className="text-sm text-slate-500">{card.hint}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {locale === "en" ? "Operational Checkpoints" : "運営上の確認ポイント"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "en" ? "Key daily metrics to watch." : "今の機能セットで日常的に見たい状態をまとめています。"}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">{locale === "en" ? "Unlisted / Deactivated Vendors" : "掲載停止・未掲載の会社"}</p>
                      <p className="mt-1">{locale === "en" ? `${companies.filter((entry) => !entry.listed).length} companies` : `${companies.filter((entry) => !entry.listed).length}社`}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">{locale === "en" ? "Vendors Without Active Billing" : "決済が有効でない会社"}</p>
                      <p className="mt-1">{locale === "en" ? `${companies.filter((entry) => entry.billingStatus !== "active").length} companies` : `${companies.filter((entry) => entry.billingStatus !== "active").length}社`}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">{locale === "en" ? "Flagged Vendors" : "フラグ済みの会社"}</p>
                      <p className="mt-1">{locale === "en" ? `${companies.filter((entry) => Boolean(entry.company.flaggedAt)).length} companies` : `${companies.filter((entry) => Boolean(entry.company.flaggedAt)).length}社`}</p>
                    </div>
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {locale === "en" ? "Top Listing Candidates" : "最近の掲載候補"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "en" ? "Top vendors sorted by listing score." : "スコア順に上位の開発会社を確認できます。"}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {companies.slice(0, 5).map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">score {entry.company.listingScore ?? 0}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {entry.company.country} / {planLabel(entry.company.plan, locale)} / {locale === "en" ? `${entry.company.listingCompletedProjectsCount ?? 0} completed` : `完了案件 ${entry.company.listingCompletedProjectsCount ?? 0}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{locale === "en" ? "Vendors Needing Attention" : "要確認の開発会社"}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "en" ? "Unlisted, billing paused, or flagged vendors." : "未掲載、決済停止、フラグ付きの会社をすぐ見返せます。"}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {attentionVendors.map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className={billingBadgeClass(entry.billingStatus)}>{billingStatusLabel(entry.billingStatus, locale)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.company.country}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {!entry.listed ? <Badge className="border-slate-200 bg-slate-100 text-slate-700">{locale === "en" ? "Unlisted" : "未掲載"}</Badge> : null}
                          {entry.company.flaggedAt ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">{locale === "en" ? "Flagged" : "フラグ"}</Badge> : null}
                          {entry.company.removedAt ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">{locale === "en" ? "Removed" : "公開停止"}</Badge> : null}
                        </div>
                      </div>
                    ))}
                    {attentionVendors.length === 0 ? <p className="text-sm text-slate-500">{locale === "en" ? "No vendors need attention right now." : "現在、要確認の会社はありません。"}</p> : null}
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{locale === "en" ? "Upcoming Plan Changes" : "次回反映のプラン変更"}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "en" ? "Plans scheduled to change on next billing cycle." : "次回更新時に変わるプラン予約を確認できます。"}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {upcomingPlanChanges.map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className="border-blue-200 bg-blue-50 text-blue-700">{planLabel(entry.pendingPlan!, locale)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {locale === "en" ? `Current: ${planLabel(entry.company.plan, locale)}` : `現在: ${planLabel(entry.company.plan, locale)}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {locale === "en" ? `Billing renewal: ${formatDateShort(entry.currentPeriodEnd, locale)}` : `請求更新日: ${formatDateShort(entry.currentPeriodEnd, locale)}`}
                        </p>
                      </div>
                    ))}
                    {upcomingPlanChanges.length === 0 ? <p className="text-sm text-slate-500">{locale === "en" ? "No plan changes scheduled." : "予約されたプラン変更はありません。"}</p> : null}
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{locale === "en" ? "Most Active Clients" : "活動量の高いクライアント"}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "en" ? "Clients with the most project activity." : "案件数が多いクライアントを把握できます。"}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {activeBuyers.map((buyer) => (
                      <div key={buyer.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{buyer.companyName}</p>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {locale === "en" ? `${buyer.activeProjectCount + buyer.completedProjectCount} jobs` : `${buyer.activeProjectCount + buyer.completedProjectCount}件`}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{buyer.contactName} / {buyer.industry || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {locale === "en"
                            ? `Active ${buyer.activeProjectCount} / Done ${buyer.completedProjectCount} / Saved ${buyer.savedCompanyCount}`
                            : `進行中 ${buyer.activeProjectCount} / 完了 ${buyer.completedProjectCount} / 保存候補 ${buyer.savedCompanyCount}`}
                        </p>
                      </div>
                    ))}
                    {activeBuyers.length === 0 ? <p className="text-sm text-slate-500">{locale === "en" ? "No client activity yet." : "まだクライアント活動はありません。"}</p> : null}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {activeView === "vendors" ? (
            <div className="grid gap-4">
              <Card className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="max-w-sm"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder={locale === "en" ? "Search by name, country, email, or tech" : "会社名・国・メール・技術で検索"}
                  />
                  <select className="select-field w-48" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value as typeof vendorFilter)}>
                    <option value="all">{locale === "en" ? "All" : "すべて"}</option>
                    <option value="listed">{locale === "en" ? "Listed" : "掲載中"}</option>
                    <option value="unlisted">{locale === "en" ? "Unlisted" : "未掲載"}</option>
                    <option value="active-billing">{locale === "en" ? "Active Billing" : "決済有効"}</option>
                    <option value="attention">{locale === "en" ? "Needs Attention" : "要確認"}</option>
                  </select>
                </div>
              </Card>

              <div className="grid gap-4">
                {filteredVendors.map((entry) => (
                  <Card key={entry.company.id} className="grid gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{entry.company.name}</h3>
                          <Badge className={entry.listed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}>
                            {entry.listed ? (locale === "en" ? "Listed" : "掲載中") : (locale === "en" ? "Unlisted" : "未掲載")}
                          </Badge>
                          <Badge className={billingBadgeClass(entry.billingStatus)}>{billingStatusLabel(entry.billingStatus, locale)}</Badge>
                          {entry.company.flaggedAt ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">{locale === "en" ? "Flagged" : "フラグ"}</Badge> : null}
                          {entry.company.removedAt ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">{locale === "en" ? "Removed" : "公開停止"}</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.company.country} / {entry.contactEmail || entry.company.publicContactEmail || "-"}</p>
                        <p className="mt-2 text-sm text-slate-700">{entry.company.summary || (locale === "en" ? "No company summary" : "会社紹介なし")}</p>
                      </div>
                      <div className="grid min-w-[260px] gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p>{locale === "en" ? "Listing score:" : "掲載スコア:"} <span className="font-semibold text-slate-900">{entry.company.listingScore ?? 0}</span></p>
                        <p>{locale === "en" ? "Completed jobs:" : "完了案件:"} <span className="font-semibold text-slate-900">{entry.company.listingCompletedProjectsCount ?? 0}</span></p>
                        <p>{locale === "en" ? "Portfolio:" : "ポートフォリオ:"} <span className="font-semibold text-slate-900">{locale === "en" ? `${entry.company.portfolioProjects.length} items` : `${entry.company.portfolioProjects.length}件`}</span></p>
                        <p>{locale === "en" ? "Plan:" : "プラン:"} <span className="font-semibold text-slate-900">{planLabel(entry.company.plan, locale)}</span></p>
                        <p>{locale === "en" ? "Rate:" : "単価:"} <span className="font-semibold text-slate-900">{formatYenRateRange(entry.company.minRate, entry.company.maxRate, locale)}</span></p>
                        <p>{locale === "en" ? "Billing renewal:" : "決済更新日:"} <span className="font-semibold text-slate-900">{formatDateShort(entry.currentPeriodEnd, locale)}</span></p>
                        <p>{locale === "en" ? "Registered:" : "登録日:"} <span className="font-semibold text-slate-900">{formatDateShort(entry.createdAt, locale)}</span></p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="grid gap-2 text-sm text-slate-700">
                        <p>{locale === "en" ? "Contact:" : "担当者:"} <span className="font-semibold text-slate-900">{entry.company.contactName || "-"}</span></p>
                        <p>{locale === "en" ? "Preferred language:" : "優先言語:"} <span className="font-semibold text-slate-900">{entry.company.preferredLanguage ?? "-"}</span></p>
                        <p>{locale === "en" ? "Listed since:" : "掲載開始:"} <span className="font-semibold text-slate-900">{formatDate(entry.publishedAt, locale)}</span></p>
                        <p>{locale === "en" ? "Onboarding:" : "オンボーディング記録:"} <span className="font-semibold text-slate-900">{onboardingStatusLabel(entry.applicationStatus, locale)}</span></p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {entry.company.services.length > 0
                            ? entry.company.services.map((service) => <Badge key={`${entry.company.id}-${service}`}>{service}</Badge>)
                            : <span className="text-slate-500">{locale === "en" ? "No tech stack set" : "技術スタック未設定"}</span>}
                        </div>
                        {entry.pendingPlan ? (
                          <p>{locale === "en" ? "Next plan change:" : "次回プラン変更:"} <span className="font-semibold text-slate-900">{planLabel(entry.pendingPlan, locale)}</span></p>
                        ) : null}
                        {entry.company.flagReason ? <p className="text-amber-700">{locale === "en" ? `Flag reason: ${entry.company.flagReason}` : `フラグ理由: ${entry.company.flagReason}`}</p> : null}
                        {entry.company.deactivationReason ? <p className="text-slate-600">{locale === "en" ? `Deactivation reason: ${entry.company.deactivationReason}` : `停止理由: ${entry.company.deactivationReason}`}</p> : null}
                        {entry.company.removedReason ? <p className="text-rose-700">{locale === "en" ? `Removal reason: ${entry.company.removedReason}` : `公開停止理由: ${entry.company.removedReason}`}</p> : null}
                      </div>

                      <div className="grid gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold text-slate-500">
                            {locale === "en" ? "Update access period (manual billing)" : "利用期限の更新（手動決済）"}
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={renewalDates[entry.company.id] ?? entry.currentPeriodEnd?.slice(0, 10) ?? ""}
                              onChange={(e) => setRenewalDates((prev) => ({ ...prev, [entry.company.id]: e.target.value }))}
                              className="flex-1 text-sm"
                            />
                            <Button
                              className="whitespace-nowrap"
                              onClick={() => void handleRenew(entry.company.id)}
                              disabled={renewalLoadingId === entry.company.id || !(renewalDates[entry.company.id] ?? entry.currentPeriodEnd?.slice(0, 10))}
                            >
                              {renewalLoadingId === entry.company.id
                                ? (locale === "en" ? "Updating..." : "更新中...")
                                : (locale === "en" ? "Update" : "期限更新")}
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={moderationReasons[entry.company.id] ?? ""}
                          onChange={(e) => setModerationReasons((prev) => ({ ...prev, [entry.company.id]: e.target.value }))}
                          placeholder={locale === "en" ? "Reason or note (optional)" : "理由や警告メモ（任意）"}
                        />
                        <div className="flex flex-wrap gap-2">
                          {entry.listed ? (
                            <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(entry.company.id, "deactivate")} disabled={moderationLoadingId === entry.company.id}>
                              {moderationLoadingId === entry.company.id ? (locale === "en" ? "Updating..." : "更新中...") : (locale === "en" ? "Deactivate" : "掲載停止")}
                            </Button>
                          ) : (
                            <Button className="whitespace-nowrap" onClick={() => void handleModeration(entry.company.id, "reactivate")} disabled={moderationLoadingId === entry.company.id}>
                              {moderationLoadingId === entry.company.id ? (locale === "en" ? "Updating..." : "更新中...") : (locale === "en" ? "Reactivate" : "再開")}
                            </Button>
                          )}
                          <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleModeration(entry.company.id, "flag")} disabled={moderationLoadingId === entry.company.id}>
                            {locale === "en" ? "Flag" : "フラグ"}
                          </Button>
                          <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(entry.company.id, "remove")} disabled={moderationLoadingId === entry.company.id}>
                            {locale === "en" ? "Remove" : "公開停止"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredVendors.length === 0 ? (
                  <Card><p className="text-sm text-slate-500">{locale === "en" ? "No vendors match the current filter." : "該当する開発会社はありません。"}</p></Card>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeView === "buyers" ? (
            <div className="grid gap-4">
              <Card className="grid gap-3">
                <Input
                  className="max-w-sm"
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  placeholder={locale === "en" ? "Search by company, contact, or email" : "会社名・担当者・メールで検索"}
                />
              </Card>
              <Card className="overflow-hidden p-0">
                <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[2fr,1.2fr,1.3fr,120px,120px,120px]">
                  <span>{locale === "en" ? "Company" : "会社"}</span>
                  <span>{locale === "en" ? "Contact / Email" : "担当 / メール"}</span>
                  <span>{locale === "en" ? "Industry" : "業種"}</span>
                  <span>{locale === "en" ? "Saved" : "保存候補"}</span>
                  <span>{locale === "en" ? "Active" : "進行中"}</span>
                  <span>{locale === "en" ? "Done" : "完了"}</span>
                </div>
                {filteredBuyers.map((buyer) => (
                  <div key={buyer.id} className="grid gap-2 border-t border-slate-100 px-4 py-4 first:border-t-0 md:grid-cols-[2fr,1.2fr,1.3fr,120px,120px,120px] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{buyer.companyName}</p>
                      <p className="mt-1 text-xs text-slate-500">{locale === "en" ? `Joined: ${formatDateShort(buyer.createdAt, locale)}` : `登録日: ${formatDateShort(buyer.createdAt, locale)}`}</p>
                    </div>
                    <div className="text-sm text-slate-700">
                      <p>{buyer.contactName}</p>
                      <p className="text-xs text-slate-500">{buyer.email || "-"}</p>
                    </div>
                    <p className="text-sm text-slate-700">{buyer.industry || "-"}</p>
                    <p className="text-sm font-semibold text-slate-900">{buyer.savedCompanyCount}</p>
                    <p className="text-sm font-semibold text-slate-900">{buyer.activeProjectCount}</p>
                    <p className="text-sm font-semibold text-slate-900">{buyer.completedProjectCount}</p>
                  </div>
                ))}
                {filteredBuyers.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500">{locale === "en" ? "No clients match the search." : "該当するクライアントはありません。"}</p>
                ) : null}
              </Card>
            </div>
          ) : null}

          {activeView === "create" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Vendor creation */}
              <Card className="grid gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {locale === "en" ? "Create Vendor Account" : "開発会社アカウント作成"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {locale === "en"
                      ? "For vendors who paid manually. Activates the account immediately without Stripe."
                      : "手動決済済みのベンダー向け。Stripe 不要でアカウントを即時有効化します。"}
                  </p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Company Name" : "会社名"} <span className="text-rose-500">*</span></span>
                    <Input required aria-invalid={vendorFieldInvalid.companyName} className={vendorFieldInvalid.companyName ? "border-rose-400 bg-rose-50/40" : undefined} value={newVendorForm.companyName} onChange={(e) => setNewVendorForm((p) => ({ ...p, companyName: e.target.value }))} placeholder="Acme Development Inc." />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Contact Name" : "担当者名"} <span className="text-rose-500">*</span></span>
                      <Input required aria-invalid={vendorFieldInvalid.contactName} className={vendorFieldInvalid.contactName ? "border-rose-400 bg-rose-50/40" : undefined} value={newVendorForm.contactName} onChange={(e) => setNewVendorForm((p) => ({ ...p, contactName: e.target.value }))} placeholder={locale === "en" ? "Taro Yamada" : "山田 太郎"} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Country" : "国"}</span>
                      <Input value={newVendorForm.country} onChange={(e) => setNewVendorForm((p) => ({ ...p, country: e.target.value }))} placeholder="Vietnam" />
                    </label>
                  </div>
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Login Email" : "ログインメール"} <span className="text-rose-500">*</span></span>
                    <Input required type="email" aria-invalid={vendorFieldInvalid.email} className={vendorFieldInvalid.email ? "border-rose-400 bg-rose-50/40" : undefined} value={newVendorForm.email} onChange={(e) => setNewVendorForm((p) => ({ ...p, email: e.target.value }))} placeholder="vendor@example.com" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Initial Password (min 8 chars)" : "初期パスワード（8文字以上）"} <span className="text-rose-500">*</span></span>
                    <PasswordInput required aria-invalid={vendorFieldInvalid.password} className={vendorFieldInvalid.password ? "border-rose-400 bg-rose-50/40" : undefined} value={newVendorForm.password} onChange={(e) => setNewVendorForm((p) => ({ ...p, password: e.target.value }))} />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Plan" : "プラン"}</span>
                      <select className="select-field" value={newVendorForm.plan} onChange={(e) => setNewVendorForm((p) => ({ ...p, plan: e.target.value as "basic" | "translation" }))}>
                        <option value="basic">{locale === "en" ? "Basic (¥5,000/mo)" : "ベーシック（¥5,000/月）"}</option>
                        <option value="translation">{locale === "en" ? "With Translation (¥10,000/mo)" : "翻訳付き（¥10,000/月）"}</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Access End Date" : "利用終了日"} <span className="text-rose-500">*</span></span>
                      <Input required type="date" aria-invalid={vendorFieldInvalid.accessEndsAt} className={vendorFieldInvalid.accessEndsAt ? "border-rose-400 bg-rose-50/40" : undefined} value={newVendorForm.accessEndsAt} onChange={(e) => setNewVendorForm((p) => ({ ...p, accessEndsAt: e.target.value }))} />
                    </label>
                  </div>
                </div>
                {newVendorMessage ? (
                  <p className={`text-sm font-medium ${newVendorMessage.ok ? "text-emerald-700" : "text-rose-600"}`}>{newVendorMessage.text}</p>
                ) : null}
                <Button onClick={() => void handleCreateVendor()} disabled={newVendorLoading} className="w-full">
                  {newVendorLoading
                    ? (locale === "en" ? "Creating..." : "作成中...")
                    : (locale === "en" ? "Create Vendor Account" : "開発会社アカウントを作成")}
                </Button>
              </Card>

              {/* Buyer creation */}
              <Card className="grid gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {locale === "en" ? "Create Client Account" : "クライアントアカウント作成"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {locale === "en"
                      ? "For Japanese companies that prefer not to self-register. Create the account on their behalf."
                      : "自社登録を希望しない日本企業向け。代理でアカウントを作成します。"}
                  </p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Company Name" : "会社名"} <span className="text-rose-500">*</span></span>
                    <Input required aria-invalid={buyerFieldInvalid.companyName} className={buyerFieldInvalid.companyName ? "border-rose-400 bg-rose-50/40" : undefined} value={newBuyerForm.companyName} onChange={(e) => setNewBuyerForm((p) => ({ ...p, companyName: e.target.value }))} placeholder={locale === "en" ? "Sample Corp." : "株式会社サンプル"} />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Contact Name" : "担当者名"} <span className="text-rose-500">*</span></span>
                      <Input required aria-invalid={buyerFieldInvalid.contactName} className={buyerFieldInvalid.contactName ? "border-rose-400 bg-rose-50/40" : undefined} value={newBuyerForm.contactName} onChange={(e) => setNewBuyerForm((p) => ({ ...p, contactName: e.target.value }))} placeholder={locale === "en" ? "Hanako Suzuki" : "鈴木 花子"} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="field-label">{locale === "en" ? "Industry" : "業種"}</span>
                      <Input value={newBuyerForm.industry} onChange={(e) => setNewBuyerForm((p) => ({ ...p, industry: e.target.value }))} placeholder={locale === "en" ? "Manufacturing" : "製造業"} />
                    </label>
                  </div>
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Login Email" : "ログインメール"} <span className="text-rose-500">*</span></span>
                    <Input required type="email" aria-invalid={buyerFieldInvalid.email} className={buyerFieldInvalid.email ? "border-rose-400 bg-rose-50/40" : undefined} value={newBuyerForm.email} onChange={(e) => setNewBuyerForm((p) => ({ ...p, email: e.target.value }))} placeholder="buyer@example.co.jp" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="field-label">{locale === "en" ? "Initial Password (min 8 chars)" : "初期パスワード（8文字以上）"} <span className="text-rose-500">*</span></span>
                    <PasswordInput required aria-invalid={buyerFieldInvalid.password} className={buyerFieldInvalid.password ? "border-rose-400 bg-rose-50/40" : undefined} value={newBuyerForm.password} onChange={(e) => setNewBuyerForm((p) => ({ ...p, password: e.target.value }))} />
                  </label>
                  <p className="text-xs text-slate-500">
                    {locale === "en"
                      ? "Client accounts have no expiry. To revoke access, deactivate the account manually."
                      : "クライアントアカウントに利用期限はありません。アクセスを停止する場合は管理者側でアカウントを無効化してください。"}
                  </p>
                </div>
                {newBuyerMessage ? (
                  <p className={`text-sm font-medium ${newBuyerMessage.ok ? "text-emerald-700" : "text-rose-600"}`}>{newBuyerMessage.text}</p>
                ) : null}
                <Button onClick={() => void handleCreateBuyer()} disabled={newBuyerLoading} className="w-full">
                  {newBuyerLoading
                    ? (locale === "en" ? "Creating..." : "作成中...")
                    : (locale === "en" ? "Create Client Account" : "クライアントアカウントを作成")}
                </Button>
              </Card>
            </div>
          ) : null}

          {activeView === "records" ? (
            <Card className="grid gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{locale === "en" ? "Onboarding Records" : "オンボーディング記録"}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {locale === "en"
                    ? "Approval flow is not required, but registration history is kept for reference."
                    : "承認フローは不要ですが、登録履歴の確認用に保持しています。"}
                </p>
              </div>
              <div className="grid gap-3">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{app.company.name}</p>
                        <p className="text-sm text-slate-600">{app.contactName} / {app.contactEmail}</p>
                      </div>
                      <Badge className={statusBadgeClass(app.status)}>{onboardingStatusLabel(app.status, locale)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {app.company.country} / {planLabel(app.company.plan, locale)} / {locale === "en" ? `Submitted ${formatDate(app.submittedAt, locale)}` : `提出日 ${formatDate(app.submittedAt, locale)}`}
                    </p>
                    {app.reviewNote ? <p className="mt-2 text-xs text-slate-500">{locale === "en" ? `Note: ${app.reviewNote}` : `メモ: ${app.reviewNote}`}</p> : null}
                  </div>
                ))}
                {applications.length === 0 ? <p className="text-sm text-slate-500">{locale === "en" ? "No registration records." : "登録記録はありません。"}</p> : null}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
