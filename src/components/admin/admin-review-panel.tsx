"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Company, VendorApplication } from "@/lib/domain/types";

function statusBadgeClass(status: VendorApplication["status"]) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "changes_requested") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "draft") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatYenRateRange(minRate: number, maxRate: number) {
  return `¥${minRate.toLocaleString("ja-JP")}-¥${maxRate.toLocaleString("ja-JP")}/時`;
}

export function AdminReviewPanel({
  initialAdminEmail = null,
  initialApplications = [],
  initialCompanies = []
}: {
  initialAdminEmail?: string | null;
  initialApplications?: VendorApplication[];
  initialCompanies?: Company[];
}) {
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail ?? "");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(Boolean(initialAdminEmail));
  const [adminMessage, setAdminMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState("");
  const [applications, setApplications] = useState<VendorApplication[]>(initialApplications);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [moderationLoadingId, setModerationLoadingId] = useState("");
  const [moderationReasons, setModerationReasons] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | VendorApplication["status"]>("all");

  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: payload.error ?? "リクエストに失敗しました。" };
    return { ok: true, data: payload };
  }

  async function loadApplications() {
    const response = await readJson<{ applications: VendorApplication[] }>("/api/vendors/applications");
    if (!response.ok || !response.data) return;
    setApplications(response.data.applications);
  }

  async function loadCompanies() {
    const response = await readJson<{ companies: Company[] }>("/api/admin/vendors");
    if (!response.ok || !response.data) return;
    setCompanies(response.data.companies);
  }

  useEffect(() => {
    if (!adminLoggedIn) return;
    void Promise.all([loadApplications(), loadCompanies()]);
  }, [adminLoggedIn]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  async function handleReview(appId: string, decision: "approved" | "changes_requested" | "rejected") {
    setReviewLoadingId(appId);
    const response = await readJson<{ application: VendorApplication }>(`/api/vendors/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNote: reviewNotes[appId] ?? "" })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: "審査更新に失敗しました", description: response.error ?? "時間をおいて再度お試しください。" });
      setReviewLoadingId("");
      return;
    }
    setApplications((prev) => prev.map((entry) => (entry.id === appId ? response.data!.application : entry)));
    if (decision === "approved") {
      await loadCompanies();
    }
    toast({
      tone: "success",
      title: decision === "approved" ? "承認しました" : decision === "changes_requested" ? "修正依頼を送信しました" : "却下しました"
    });
    setReviewLoadingId("");
  }

  async function handleModeration(companyId: string, action: "deactivate" | "reactivate" | "flag" | "remove") {
    setModerationLoadingId(companyId);
    const response = await readJson<{ company: Company }>(`/api/admin/vendors/${companyId}/moderation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: moderationReasons[companyId] ?? "" })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: "会社管理の更新に失敗しました", description: response.error ?? "時間をおいて再度お試しください。" });
      setModerationLoadingId("");
      return;
    }
    setCompanies((prev) => prev.map((entry) => (entry.id === companyId ? response.data!.company : entry)));
    toast({
      tone: "success",
      title:
        action === "deactivate"
          ? "掲載を停止しました"
          : action === "reactivate"
            ? "掲載を再開しました"
            : action === "flag"
              ? "会社をフラグしました"
              : "会社を公開停止しました"
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
    toast({ tone: "success", title: "管理者としてログインしました" });
    await Promise.all([loadApplications(), loadCompanies()]);
    setLoginLoading(false);
  }

  async function handleAdminLogout() {
    setLogoutLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminLoggedIn(false);
    setAdminPassword("");
    setApplications([]);
    setCompanies([]);
    setAdminMessage("");
    toast({ tone: "info", title: "ログアウトしました" });
    setLogoutLoading(false);
  }

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const changesRequestedCount = applications.filter((a) => a.status === "changes_requested").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <Card className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white">
          <p className="text-xs font-semibold tracking-wide text-slate-200">ADMIN</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold">開発会社 登録・公開管理</h1>
          <p className="mt-2 text-sm text-slate-200">登録済みの開発会社情報を確認し、必要な場合だけ掲載停止や公開停止などのモデレーションを行います。</p>
        </div>
      </Card>

      {!adminLoggedIn ? (
        <Card className="grid gap-3">
          <h2 className="section-title">管理者ログイン</h2>
          <p className="section-subtitle">管理者アカウントでログインし、開発会社の申請を審査します。</p>
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
                <h2 className="section-title">登録会社一覧</h2>
                <p className="section-subtitle">
                  総登録 {applications.length} / 掲載中 {approvedCount} / 下書き {applications.filter((a) => a.status === "draft").length} / 却下 {rejectedCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="select-field w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="draft">下書き</option>
                  <option value="approved">掲載中</option>
                  <option value="rejected">却下</option>
                  <option value="all">すべて</option>
                </select>
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void Promise.all([loadApplications(), loadCompanies()])}>再読み込み</Button>
                <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleAdminLogout()} disabled={logoutLoading}>
                  {logoutLoading ? "ログアウト中..." : "ログアウト"}
                </Button>
                <Link href="/app" className="inline-flex whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  ユーザー画面へ
                </Link>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="hidden bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[2fr,1fr,1fr,130px]">
              <span>会社</span>
              <span>担当</span>
              <span>申請日</span>
              <span>状態</span>
            </div>
            {filtered.map((app) => (
              <div key={app.id} className="border-t border-slate-100 px-4 py-3 first:border-t-0">
                <div className="grid gap-2 md:grid-cols-[2fr,1fr,1fr,130px] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="text-left font-semibold text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline"
                        onClick={() => setExpandedApplicationId((current) => (current === app.id ? null : app.id))}
                      >
                        {app.company.name}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        onClick={() => setExpandedApplicationId((current) => (current === app.id ? null : app.id))}
                      >
                        {expandedApplicationId === app.id ? "詳細を閉じる" : "申請詳細を見る"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{app.company.summary}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>{app.contactName}</p>
                    <p className="text-xs">{app.contactEmail}</p>
                  </div>
                  <p className="text-sm text-slate-600">{new Date(app.submittedAt).toLocaleDateString("ja-JP")}</p>
                  <div>
                    <Badge className={statusBadgeClass(app.status)}>{app.status}</Badge>
                  </div>
                </div>
                {expandedApplicationId === app.id ? (
                  <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">基本情報</p>
                      <div className="mt-2 grid gap-1 text-sm text-slate-700">
                        <p>会社名: <span className="font-semibold text-slate-900">{app.company.name}</span></p>
                        <p>国: <span className="font-semibold text-slate-900">{app.company.country}</span></p>
                          <p>担当者: <span className="font-semibold text-slate-900">{app.contactName}</span></p>
                          <p>連絡先メール: <span className="font-semibold text-slate-900">{app.contactEmail}</span></p>
                          <p>プラン: <span className="font-semibold text-slate-900">{app.company.plan === "translation" ? "翻訳付き" : "ベーシック"}</span></p>
                          <p>優先言語: <span className="font-semibold text-slate-900">{app.company.preferredLanguage ?? "-"}</span></p>
                          <p>申請状態: <span className="font-semibold text-slate-900">{app.status}</span></p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500">公開情報 / 条件</p>
                        <div className="mt-2 grid gap-1 text-sm text-slate-700">
                          <p>Webサイト: <span className="font-semibold text-slate-900">{app.company.websiteUrl ?? "-"}</span></p>
                          <p>公開メール: <span className="font-semibold text-slate-900">{app.company.publicContactEmail ?? "-"}</span></p>
                          <p>公開電話: <span className="font-semibold text-slate-900">{app.company.publicContactPhone ?? "-"}</span></p>
                          <p>単価目安: <span className="font-semibold text-slate-900">{formatYenRateRange(app.company.minRate, app.company.maxRate)}</span></p>
                          <p>チーム人数: <span className="font-semibold text-slate-900">{app.company.teamSize}名</span></p>
                          <p>英語 / 日本語: <span className="font-semibold text-slate-900">{app.company.english} / {app.company.japaneseSupport}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500">申請メタ情報</p>
                        <div className="mt-2 grid gap-1 text-sm text-slate-700">
                          <p>初回提出: <span className="font-semibold text-slate-900">{app.lastSubmittedAt ? new Date(app.lastSubmittedAt).toLocaleString("ja-JP") : "-"}</span></p>
                          <p>再提出: <span className="font-semibold text-slate-900">{app.lastResubmittedAt ? new Date(app.lastResubmittedAt).toLocaleString("ja-JP") : "-"}</span></p>
                          <p>利用規約同意: <span className="font-semibold text-slate-900">{app.termsAcceptedAt ? new Date(app.termsAcceptedAt).toLocaleString("ja-JP") : "-"}</span></p>
                          <p>規約バージョン: <span className="font-semibold text-slate-900">{app.termsVersion ?? "-"}</span></p>
                        </div>
                      </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">内部メモ</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                          {app.reviewNote?.trim() ? app.reviewNote : "まだ内部メモはありません。"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">会社紹介</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{app.company.summary}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">サービス</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {app.company.services.length > 0 ? (
                          app.company.services.map((service) => <Badge key={`${app.id}-${service}`}>{service}</Badge>)
                        ) : (
                          <p className="text-sm text-slate-500">登録なし</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">ポートフォリオ</p>
                      <div className="mt-3 grid gap-3">
                        {app.company.portfolioProjects.length > 0 ? (
                          app.company.portfolioProjects.map((project) => (
                            <div key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                                <Badge>{project.projectType}</Badge>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">{project.summary}</p>
                              <div className="mt-2 grid gap-1 text-xs text-slate-600">
                                <p>期間: <span className="font-semibold text-slate-900">{project.durationLabel || "-"}</span></p>
                                <p>予算目安: <span className="font-semibold text-slate-900">{project.budgetLabel || "-"}</span></p>
                                <p>成果: <span className="font-semibold text-slate-900">{project.businessImpact || "-"}</span></p>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {project.technologies.map((tech) => <Badge key={`${project.id}-${tech}`}>{tech}</Badge>)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">ポートフォリオ未登録</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                {app.reviewNote ? <p className="mt-2 text-xs text-slate-600">コメント: {app.reviewNote}</p> : null}
                <p className="mt-3 text-xs text-slate-500">オンボーディング承認は不要です。公開状態は決済とプロフィール入力状況に応じて自動反映されます。</p>
              </div>
            ))}
            {filtered.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">該当する申請はありません。</p> : null}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">公開会社の管理</h2>
              <p className="mt-1 text-sm text-slate-600">掲載停止、再開、フラグ付け、公開停止を管理します。</p>
            </div>
            <div className="grid gap-0">
              {companies.map((company) => (
                <div key={company.id} className="border-t border-slate-100 px-4 py-4 first:border-t-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{company.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{company.country} / {company.publicContactEmail ?? "no public email"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className={company.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}>
                          {company.active ? "公開中" : "停止中"}
                        </Badge>
                        {company.flaggedAt ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">フラグ済み</Badge> : null}
                        {company.removedAt ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">公開停止</Badge> : null}
                      </div>
                    </div>
                    <div className="w-full max-w-xl">
                      <Input
                        value={moderationReasons[company.id] ?? ""}
                        onChange={(e) => setModerationReasons((prev) => ({ ...prev, [company.id]: e.target.value }))}
                        placeholder="理由や警告メモ（任意）"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {company.active ? (
                          <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(company.id, "deactivate")} disabled={moderationLoadingId === company.id}>
                            {moderationLoadingId === company.id ? "更新中..." : "掲載停止"}
                          </Button>
                        ) : (
                          <Button className="whitespace-nowrap" onClick={() => void handleModeration(company.id, "reactivate")} disabled={moderationLoadingId === company.id}>
                            {moderationLoadingId === company.id ? "更新中..." : "再開"}
                          </Button>
                        )}
                        <Button className="whitespace-nowrap" variant="ghost" onClick={() => void handleModeration(company.id, "flag")} disabled={moderationLoadingId === company.id}>
                          フラグ
                        </Button>
                        <Button className="whitespace-nowrap" variant="secondary" onClick={() => void handleModeration(company.id, "remove")} disabled={moderationLoadingId === company.id}>
                          公開停止
                        </Button>
                      </div>
                      {company.flagReason ? <p className="mt-2 text-xs text-amber-700">フラグ理由: {company.flagReason}</p> : null}
                      {company.deactivationReason ? <p className="mt-1 text-xs text-slate-600">停止理由: {company.deactivationReason}</p> : null}
                      {company.removedReason ? <p className="mt-1 text-xs text-rose-700">公開停止理由: {company.removedReason}</p> : null}
                    </div>
                  </div>
                </div>
              ))}
              {companies.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">管理対象の公開会社はまだありません。</p> : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
