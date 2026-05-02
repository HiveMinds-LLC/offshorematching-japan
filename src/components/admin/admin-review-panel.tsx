"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { AdminBuyerSummary, AdminDashboardSummary, AdminVendorSummary, VendorApplication } from "@/lib/domain/types";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP");
}

function formatDateShort(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ja-JP");
}

function formatYenRateRange(minRate: number, maxRate: number) {
  return `¥${minRate.toLocaleString("ja-JP")}-¥${maxRate.toLocaleString("ja-JP")}/時`;
}

function planLabel(plan: "basic" | "translation") {
  return plan === "translation" ? "翻訳付き" : "ベーシック";
}

function billingBadgeClass(status: AdminVendorSummary["billingStatus"]) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "canceled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function billingStatusLabel(status: AdminVendorSummary["billingStatus"]) {
  if (status === "active") return "決済有効";
  if (status === "paused") return "一時停止";
  if (status === "canceled") return "停止済み";
  return "決済待ち";
}

function onboardingStatusLabel(status?: string) {
  if (status === "approved") return "掲載中";
  if (status === "draft") return "下書き";
  if (status === "rejected") return "却下";
  if (status === "changes_requested") return "修正依頼";
  return status ?? "-";
}

function statusBadgeClass(status?: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "changes_requested") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "draft") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function overviewCards(summary: AdminDashboardSummary) {
  return [
    { label: "発注企業", value: `${summary.buyerCount}社`, hint: "登録済みのクライアント" },
    { label: "開発会社", value: `${summary.vendorCount}社`, hint: "登録済みベンダー" },
    { label: "掲載中", value: `${summary.listedVendorCount}社`, hint: "公開ディレクトリに表示中" },
    { label: "決済有効", value: `${summary.activeBillingCount}社`, hint: "有効課金アカウント" },
    { label: "進行中案件", value: `${summary.activeMatchCount}件`, hint: "未完了の案件" },
    { label: "完了案件", value: `${summary.completedJobCount}件`, hint: "プラットフォーム完了実績" }
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
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail ?? "");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(Boolean(initialAdminEmail));
  const [adminMessage, setAdminMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [companies, setCompanies] = useState<AdminVendorSummary[]>(initialCompanies);
  const [buyers, setBuyers] = useState<AdminBuyerSummary[]>(initialBuyers);
  const [summary, setSummary] = useState<AdminDashboardSummary>(initialSummary);
  const [applications, setApplications] = useState<VendorApplication[]>(initialApplications);
  const [activeView, setActiveView] = useState<"overview" | "vendors" | "buyers" | "records">("overview");
  const [vendorSearch, setVendorSearch] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<"all" | "listed" | "unlisted" | "active-billing" | "attention">("all");
  const [moderationLoadingId, setModerationLoadingId] = useState("");
  const [moderationReasons, setModerationReasons] = useState<Record<string, string>>({});

  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: payload.error ?? "リクエストに失敗しました。" };
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
    toast({ tone: "success", title: "管理データを更新しました" });
  }

  async function handleModeration(companyId: string, action: "deactivate" | "reactivate" | "flag" | "remove") {
    setModerationLoadingId(companyId);
    const response = await readJson<{ company: AdminVendorSummary["company"] }>(`/api/admin/vendors/${companyId}/moderation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: moderationReasons[companyId] ?? "" })
    });

    if (!response.ok || !response.data) {
      toast({ tone: "error", title: "会社管理の更新に失敗しました", description: response.error ?? "時間をおいて再度お試しください。" });
      setModerationLoadingId("");
      return;
    }

    setCompanies((current) =>
      current.map((entry) =>
        entry.company.id === companyId
          ? {
              ...entry,
              company: {
                ...entry.company,
                ...response.data!.company
              },
              listed: Boolean(response.data!.company.active)
            }
          : entry
      )
    );

    await loadSummary();
    toast({
      tone: "success",
      title:
        action === "deactivate"
          ? "掲載を停止しました"
          : action === "reactivate"
            ? "掲載を再開しました"
            : action === "flag"
              ? "会社をフラグしました"
              : "公開停止にしました"
    });
    setModerationLoadingId("");
  }

  async function handleAdminLogin() {
    setLoginLoading(true);
    const response = await readJson<{ admin: { email: string } }>("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? "管理者ログインに失敗しました。";
      setAdminMessage(errorMessage);
      toast({ tone: "error", title: "管理者ログインに失敗しました", description: errorMessage });
      setLoginLoading(false);
      return;
    }

    setAdminLoggedIn(true);
    setAdminEmail(response.data.admin.email);
    setAdminPassword("");
    setAdminMessage("");
    await refreshAll();
    toast({ tone: "success", title: "管理者としてログインしました" });
    setLoginLoading(false);
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
    toast({ tone: "info", title: "ログアウトしました" });
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
    () =>
      companies
        .filter((entry) => !entry.listed || entry.billingStatus !== "active" || Boolean(entry.company.flaggedAt) || Boolean(entry.company.removedAt))
        .slice(0, 6),
    [companies]
  );
  const upcomingPlanChanges = useMemo(
    () => companies.filter((entry) => entry.pendingPlan).slice(0, 6),
    [companies]
  );
  const activeBuyers = useMemo(
    () =>
      [...buyers]
        .sort((a, b) => (b.activeProjectCount + b.completedProjectCount) - (a.activeProjectCount + a.completedProjectCount))
        .slice(0, 6),
    [buyers]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
      <Card className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white">
          <p className="text-xs font-semibold tracking-wide text-slate-200">ADMIN</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold">OffshoreDevelopment 運営ダッシュボード</h1>
          <p className="mt-2 text-sm text-slate-200">クライアント、開発会社、掲載状態、決済状態をまとめて確認し、必要なモデレーションだけを行います。</p>
        </div>
      </Card>

      {!adminLoggedIn ? (
        <Card className="grid gap-3">
          <h2 className="section-title">管理者ログイン</h2>
          <p className="section-subtitle">管理者アカウントでログインし、全体データを確認します。</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="field-label">管理者メール</span>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">パスワード</span>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </label>
            <div className="self-end">
              <Button className="w-full" onClick={() => void handleAdminLogin()} disabled={loginLoading}>
                {loginLoading ? "ログイン中..." : "ログイン"}
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
                <h2 className="section-title">管理ビュー</h2>
                <p className="section-subtitle">buyers: {summary.buyerCount} / vendors: {summary.vendorCount} / attention: {needsAttentionCount}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void refreshAll()}>再読み込み</Button>
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleAdminLogout()} disabled={logoutLoading}>
                  {logoutLoading ? "ログアウト中..." : "ログアウト"}
                </Button>
                <Link href="/app" className="inline-flex whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  ユーザー画面へ
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "overview", label: "概要" },
                { key: "vendors", label: `開発会社 ${companies.length}` },
                { key: "buyers", label: `クライアント ${buyers.length}` },
                { key: "records", label: `登録記録 ${applications.length}` }
              ].map((item) => (
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
                {overviewCards(summary).map((card) => (
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
                    <h3 className="text-lg font-semibold text-slate-900">運営上の確認ポイント</h3>
                    <p className="mt-1 text-sm text-slate-600">今の機能セットで日常的に見たい状態をまとめています。</p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">掲載停止・未掲載の会社</p>
                      <p className="mt-1">{companies.filter((entry) => !entry.listed).length}社</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">決済が有効でない会社</p>
                      <p className="mt-1">{companies.filter((entry) => entry.billingStatus !== "active").length}社</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">フラグ済みの会社</p>
                      <p className="mt-1">{companies.filter((entry) => Boolean(entry.company.flaggedAt)).length}社</p>
                    </div>
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">最近の掲載候補</h3>
                    <p className="mt-1 text-sm text-slate-600">スコア順に上位の開発会社を確認できます。</p>
                  </div>
                  <div className="grid gap-3">
                    {companies.slice(0, 5).map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">score {entry.company.listingScore ?? 0}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.company.country} / {planLabel(entry.company.plan)} / 完了案件 {entry.company.listingCompletedProjectsCount ?? 0}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">要確認の開発会社</h3>
                    <p className="mt-1 text-sm text-slate-600">未掲載、決済停止、フラグ付きの会社をすぐ見返せます。</p>
                  </div>
                  <div className="grid gap-3">
                    {attentionVendors.map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className={billingBadgeClass(entry.billingStatus)}>{billingStatusLabel(entry.billingStatus)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.company.country}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {!entry.listed ? <Badge className="border-slate-200 bg-slate-100 text-slate-700">未掲載</Badge> : null}
                          {entry.company.flaggedAt ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">フラグ</Badge> : null}
                          {entry.company.removedAt ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">公開停止</Badge> : null}
                        </div>
                      </div>
                    ))}
                    {attentionVendors.length === 0 ? <p className="text-sm text-slate-500">現在、要確認の会社はありません。</p> : null}
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">次回反映のプラン変更</h3>
                    <p className="mt-1 text-sm text-slate-600">次回更新時に変わるプラン予約を確認できます。</p>
                  </div>
                  <div className="grid gap-3">
                    {upcomingPlanChanges.map((entry) => (
                      <div key={entry.company.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{entry.company.name}</p>
                          <Badge className="border-blue-200 bg-blue-50 text-blue-700">{planLabel(entry.pendingPlan!)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">現在: {planLabel(entry.company.plan)}</p>
                        <p className="mt-1 text-xs text-slate-500">請求更新日: {formatDateShort(entry.currentPeriodEnd)}</p>
                      </div>
                    ))}
                    {upcomingPlanChanges.length === 0 ? <p className="text-sm text-slate-500">予約されたプラン変更はありません。</p> : null}
                  </div>
                </Card>

                <Card className="grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">活動量の高いクライアント</h3>
                    <p className="mt-1 text-sm text-slate-600">案件数が多いクライアントを把握できます。</p>
                  </div>
                  <div className="grid gap-3">
                    {activeBuyers.map((buyer) => (
                      <div key={buyer.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{buyer.companyName}</p>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">{buyer.activeProjectCount + buyer.completedProjectCount}件</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{buyer.contactName} / {buyer.industry || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">進行中 {buyer.activeProjectCount} / 完了 {buyer.completedProjectCount} / 保存候補 {buyer.savedCompanyCount}</p>
                      </div>
                    ))}
                    {activeBuyers.length === 0 ? <p className="text-sm text-slate-500">まだクライアント活動はありません。</p> : null}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {activeView === "vendors" ? (
            <div className="grid gap-4">
              <Card className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <Input className="max-w-sm" value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} placeholder="会社名・国・メール・技術で検索" />
                  <select className="select-field w-48" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value as typeof vendorFilter)}>
                    <option value="all">すべて</option>
                    <option value="listed">掲載中</option>
                    <option value="unlisted">未掲載</option>
                    <option value="active-billing">決済有効</option>
                    <option value="attention">要確認</option>
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
                          <Badge className={entry.listed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}>{entry.listed ? "掲載中" : "未掲載"}</Badge>
                          <Badge className={billingBadgeClass(entry.billingStatus)}>{billingStatusLabel(entry.billingStatus)}</Badge>
                          {entry.company.flaggedAt ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">フラグ</Badge> : null}
                          {entry.company.removedAt ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">公開停止</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.company.country} / {entry.contactEmail || entry.company.publicContactEmail || "-"}</p>
                        <p className="mt-2 text-sm text-slate-700">{entry.company.summary || "会社紹介なし"}</p>
                      </div>
                      <div className="grid min-w-[260px] gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p>掲載スコア: <span className="font-semibold text-slate-900">{entry.company.listingScore ?? 0}</span></p>
                        <p>完了案件: <span className="font-semibold text-slate-900">{entry.company.listingCompletedProjectsCount ?? 0}</span></p>
                        <p>ポートフォリオ: <span className="font-semibold text-slate-900">{entry.company.portfolioProjects.length}件</span></p>
                        <p>プラン: <span className="font-semibold text-slate-900">{planLabel(entry.company.plan)}</span></p>
                        <p>単価: <span className="font-semibold text-slate-900">{formatYenRateRange(entry.company.minRate, entry.company.maxRate)}</span></p>
                        <p>決済更新日: <span className="font-semibold text-slate-900">{formatDateShort(entry.currentPeriodEnd)}</span></p>
                        <p>登録日: <span className="font-semibold text-slate-900">{formatDateShort(entry.createdAt)}</span></p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="grid gap-2 text-sm text-slate-700">
                        <p>担当者: <span className="font-semibold text-slate-900">{entry.company.contactName || "-"}</span></p>
                        <p>優先言語: <span className="font-semibold text-slate-900">{entry.company.preferredLanguage ?? "-"}</span></p>
                        <p>掲載開始: <span className="font-semibold text-slate-900">{formatDate(entry.publishedAt)}</span></p>
                        <p>オンボーディング記録: <span className="font-semibold text-slate-900">{onboardingStatusLabel(entry.applicationStatus)}</span></p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {entry.company.services.length > 0 ? entry.company.services.map((service) => <Badge key={`${entry.company.id}-${service}`}>{service}</Badge>) : <span className="text-slate-500">技術スタック未設定</span>}
                        </div>
                        {entry.pendingPlan ? <p>次回プラン変更: <span className="font-semibold text-slate-900">{planLabel(entry.pendingPlan)}</span></p> : null}
                        {entry.company.flagReason ? <p className="text-amber-700">フラグ理由: {entry.company.flagReason}</p> : null}
                        {entry.company.deactivationReason ? <p className="text-slate-600">停止理由: {entry.company.deactivationReason}</p> : null}
                        {entry.company.removedReason ? <p className="text-rose-700">公開停止理由: {entry.company.removedReason}</p> : null}
                      </div>

                      <div>
                        <Input
                          value={moderationReasons[entry.company.id] ?? ""}
                          onChange={(e) => setModerationReasons((prev) => ({ ...prev, [entry.company.id]: e.target.value }))}
                          placeholder="理由や警告メモ（任意）"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.listed ? (
                            <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(entry.company.id, "deactivate")} disabled={moderationLoadingId === entry.company.id}>
                              {moderationLoadingId === entry.company.id ? "更新中..." : "掲載停止"}
                            </Button>
                          ) : (
                            <Button className="whitespace-nowrap" onClick={() => void handleModeration(entry.company.id, "reactivate")} disabled={moderationLoadingId === entry.company.id}>
                              {moderationLoadingId === entry.company.id ? "更新中..." : "再開"}
                            </Button>
                          )}
                          <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleModeration(entry.company.id, "flag")} disabled={moderationLoadingId === entry.company.id}>
                            フラグ
                          </Button>
                          <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(entry.company.id, "remove")} disabled={moderationLoadingId === entry.company.id}>
                            公開停止
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredVendors.length === 0 ? <Card><p className="text-sm text-slate-500">該当する開発会社はありません。</p></Card> : null}
              </div>
            </div>
          ) : null}

          {activeView === "buyers" ? (
            <div className="grid gap-4">
              <Card className="grid gap-3">
                <Input className="max-w-sm" value={buyerSearch} onChange={(e) => setBuyerSearch(e.target.value)} placeholder="会社名・担当者・メールで検索" />
              </Card>
              <Card className="overflow-hidden p-0">
                <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[2fr,1.2fr,1.3fr,120px,120px,120px]">
                  <span>会社</span>
                  <span>担当 / メール</span>
                  <span>業種</span>
                  <span>保存候補</span>
                  <span>進行中</span>
                  <span>完了</span>
                </div>
                {filteredBuyers.map((buyer) => (
                  <div key={buyer.id} className="grid gap-2 border-t border-slate-100 px-4 py-4 first:border-t-0 md:grid-cols-[2fr,1.2fr,1.3fr,120px,120px,120px] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{buyer.companyName}</p>
                      <p className="mt-1 text-xs text-slate-500">登録日: {formatDateShort(buyer.createdAt)}</p>
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
                {filteredBuyers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">該当するクライアントはありません。</p> : null}
              </Card>
            </div>
          ) : null}

          {activeView === "records" ? (
            <Card className="grid gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">オンボーディング記録</h3>
                <p className="mt-1 text-sm text-slate-600">承認フローは不要ですが、登録履歴の確認用に保持しています。</p>
              </div>
              <div className="grid gap-3">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{app.company.name}</p>
                        <p className="text-sm text-slate-600">{app.contactName} / {app.contactEmail}</p>
                      </div>
                      <Badge className={statusBadgeClass(app.status)}>{onboardingStatusLabel(app.status)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{app.company.country} / {planLabel(app.company.plan)} / 提出日 {formatDate(app.submittedAt)}</p>
                    {app.reviewNote ? <p className="mt-2 text-xs text-slate-500">メモ: {app.reviewNote}</p> : null}
                  </div>
                ))}
                {applications.length === 0 ? <p className="text-sm text-slate-500">登録記録はありません。</p> : null}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
