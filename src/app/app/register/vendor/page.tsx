"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type VendorSignupForm = {
  name: string;
  country: string;
  contactName: string;
  contactEmail: string;
  websiteUrl: string;
  publicContactEmail: string;
  publicContactPhone: string;
  summary: string;
  servicesCsv: string;
  minRate: string;
  maxRate: string;
  teamSize: string;
  english: "basic" | "medium" | "high";
  japaneseSupport: "basic" | "medium" | "high";
};

const defaults: VendorSignupForm = {
  name: "",
  country: "",
  contactName: "",
  contactEmail: "",
  websiteUrl: "",
  publicContactEmail: "",
  publicContactPhone: "",
  summary: "",
  servicesCsv: "React, Node.js",
  minRate: "25",
  maxRate: "40",
  teamSize: "20",
  english: "medium",
  japaneseSupport: "basic"
};

export default function VendorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorSignupForm>(defaults);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.contactEmail || !form.summary) {
      setMessage("会社名・連絡先メール・会社紹介は必須です。");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/vendors/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error ?? "申請に失敗しました。");
      return;
    }
    setMessage("申請を受け付けました。管理者審査後に掲載されます。");
    setForm(defaults);
    setTimeout(() => router.push("/app"), 900);
  }

  return (
    <div>
      <AppTopbar title="開発会社 掲載申請" subtitle="公開プロフィール登録" />
      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <div>
            <Button variant="ghost" onClick={() => router.back()}>前の画面へ戻る</Button>
          </div>
          <h1 className="section-title">開発会社 掲載申請</h1>
          <p className="section-subtitle">掲載料金は月額 ¥5,000。承認後にマーケットプレイスへ公開されます。</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">会社名</span>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">国</span>
              <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">担当者名</span>
              <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">連絡先メール</span>
              <Input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">WebサイトURL</span>
              <Input value={form.websiteUrl} onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">公開メール</span>
              <Input value={form.publicContactEmail} onChange={(e) => setForm((p) => ({ ...p, publicContactEmail: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">公開電話</span>
              <Input value={form.publicContactPhone} onChange={(e) => setForm((p) => ({ ...p, publicContactPhone: e.target.value }))} />
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="field-label">会社紹介</span>
            <Textarea rows={5} value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">技術スタック (カンマ区切り)</span>
            <Input value={form.servicesCsv} onChange={(e) => setForm((p) => ({ ...p, servicesCsv: e.target.value }))} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="field-label">最低単価</span>
              <Input value={form.minRate} onChange={(e) => setForm((p) => ({ ...p, minRate: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">最高単価</span>
              <Input value={form.maxRate} onChange={(e) => setForm((p) => ({ ...p, maxRate: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">チーム人数</span>
              <Input value={form.teamSize} onChange={(e) => setForm((p) => ({ ...p, teamSize: e.target.value }))} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "申請中..." : "掲載申請する"}</Button>
            <Link href="/app" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ログインへ戻る
            </Link>
          </div>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </Card>
      </main>
    </div>
  );
}
