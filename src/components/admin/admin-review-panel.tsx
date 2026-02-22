"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VendorApplication } from "@/lib/domain/types";

function statusBadgeClass(status: VendorApplication["status"]) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function AdminReviewPanel() {
  const [adminEmail, setAdminEmail] = useState("admin@offshorematch.jp");
  const [adminPassword, setAdminPassword] = useState("admin1234");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | VendorApplication["status"]>("pending");

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

  useEffect(() => {
    if (!adminLoggedIn) return;
    void loadApplications();
  }, [adminLoggedIn]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  async function handleReview(appId: string, decision: "approved" | "rejected") {
    const response = await readJson<{ application: VendorApplication }>(`/api/vendors/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
    });
    if (!response.ok || !response.data) return;
    setApplications((prev) => prev.map((entry) => (entry.id === appId ? response.data!.application : entry)));
  }

  function handleAdminLogin() {
    if (adminEmail === "admin@offshorematch.jp" && adminPassword === "admin1234") {
      setAdminLoggedIn(true);
      setAdminMessage("");
      return;
    }
    setAdminMessage("管理者ログインに失敗しました。");
  }

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <Card className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-7 text-white">
          <p className="text-xs font-semibold tracking-wide text-slate-200">ADMIN</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold">開発会社 申請管理</h1>
          <p className="mt-2 text-sm text-slate-200">申請された開発会社を審査し、承認済み企業のみ公開します。</p>
        </div>
      </Card>

      {!adminLoggedIn ? (
        <Card className="grid gap-3">
          <h2 className="section-title">管理者ログイン</h2>
          <p className="section-subtitle">デモ: admin@offshorematch.jp / admin1234</p>
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
              <Button className="w-full" onClick={handleAdminLogin}>ログイン</Button>
            </div>
          </div>
          {adminMessage ? <p className="text-sm font-medium text-rose-600">{adminMessage}</p> : null}
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">申請一覧</h2>
                <p className="section-subtitle">
                  総申請 {applications.length} / 承認 {approvedCount} / 却下 {rejectedCount} / 審査待ち {pendingCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="select-field w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="pending">審査待ち</option>
                  <option value="approved">承認済み</option>
                  <option value="rejected">却下</option>
                  <option value="all">すべて</option>
                </select>
                <Button variant="ghost" onClick={() => void loadApplications()}>再読み込み</Button>
                <Link href="/app" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
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
                    <p className="font-semibold text-slate-900">{app.company.name}</p>
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
                {app.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => void handleReview(app.id, "approved")}>承認して公開</Button>
                    <Button variant="secondary" onClick={() => void handleReview(app.id, "rejected")}>却下</Button>
                  </div>
                ) : null}
              </div>
            ))}
            {filtered.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">該当する申請はありません。</p> : null}
          </Card>
        </div>
      )}
    </div>
  );
}
