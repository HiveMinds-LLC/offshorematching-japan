"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TERMS_VERSION } from "@/lib/legal";

type VendorSignupForm = {
  plan: "basic" | "translation";
  name: string;
  country: string;
  contactName: string;
  contactEmail: string;
  websiteUrl: string;
  publicContactEmail: string;
  publicContactPhone: string;
  preferredLanguage: string;
  summary: string;
  servicesCsv: string;
  minRate: string;
  maxRate: string;
  teamSize: string;
  english: "basic" | "medium" | "high";
  japaneseSupport: "basic" | "medium" | "high";
  acceptedTerms: boolean;
};

const defaults: VendorSignupForm = {
  plan: "basic",
  name: "",
  country: "",
  contactName: "",
  contactEmail: "",
  websiteUrl: "",
  publicContactEmail: "",
  publicContactPhone: "",
  preferredLanguage: "en",
  summary: "",
  servicesCsv: "React, Node.js",
  minRate: "25",
  maxRate: "40",
  teamSize: "20",
  english: "medium",
  japaneseSupport: "basic",
  acceptedTerms: false
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
    if (!form.acceptedTerms) {
      setMessage("利用規約と月額請求条件への同意が必要です。");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/vendors/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; application?: unknown };
    if (!response.ok) {
      setLoading(false);
      setMessage(payload.error ?? "申請に失敗しました。");
      return;
    }

    const billingResponse = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application: payload.application })
    });
    const billingPayload = (await billingResponse.json().catch(() => ({}))) as { error?: string; url?: string };
    setLoading(false);
    if (!billingResponse.ok || !billingPayload.url) {
      setMessage(billingPayload.error ?? "決済ページの生成に失敗しました。");
      return;
    }

    window.location.href = billingPayload.url;
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
          <p className="section-subtitle">掲載プランを選択し、規約同意後に決済へ進みます。決済完了後に審査フローへ入ります。</p>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, plan: "basic" }))}
              className={`rounded-2xl border p-5 text-left transition ${form.plan === "basic" ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <p className="text-sm font-semibold text-slate-900">ベーシック</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">¥5,000<span className="ml-1 text-sm font-semibold text-slate-500">/月</span></p>
              <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                <li>会社掲載</li>
                <li>問い合わせ受信</li>
                <li>通常チャット</li>
              </ul>
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, plan: "translation" }))}
              className={`rounded-2xl border p-5 text-left transition ${form.plan === "translation" ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <p className="text-sm font-semibold text-slate-900">翻訳付き</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">¥10,000<span className="ml-1 text-sm font-semibold text-slate-500">/月</span></p>
              <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                <li>ベーシックの全機能</li>
                <li>原文 + 翻訳表示チャット</li>
                <li>会社ごとの優先言語設定</li>
              </ul>
            </button>
          </div>

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
            <label className="grid gap-1.5">
              <span className="field-label">会社設定言語</span>
              <select className="select-field" value={form.preferredLanguage} onChange={(e) => setForm((p) => ({ ...p, preferredLanguage: e.target.value }))}>
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
            </label>
          </div>
          <p className="text-xs text-slate-500">翻訳付きプランでは、この会社設定言語を基準にプロフィール翻訳とチャット翻訳を行います。</p>

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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">請求条件</p>
            <ul className="mt-2 grid gap-1 text-sm text-slate-700">
              <li>月額掲載料: ¥5,000</li>
              <li>翻訳付きプラン: ¥10,000</li>
              <li>決済完了後に審査を開始</li>
              <li>承認後、開発会社ダッシュボードから請求停止・再開・解約の操作が可能</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={form.acceptedTerms}
              onChange={(e) => setForm((p) => ({ ...p, acceptedTerms: e.target.checked }))}
            />
            <span className="text-sm leading-6 text-slate-700">
              <Link href="/legal/terms" className="font-semibold text-blue-700 underline underline-offset-2">利用規約</Link>
              、<Link href="/legal/privacy" className="font-semibold text-blue-700 underline underline-offset-2">プライバシーポリシー</Link>
              、<Link href="/legal/commercial-transactions" className="font-semibold text-blue-700 underline underline-offset-2">特定商取引法に基づく表記</Link>
              （版 {TERMS_VERSION}）を確認し、<strong>{form.plan === "translation" ? "月額 ¥10,000" : "月額 ¥5,000"}</strong> の継続課金条件に同意します。審査承認後も、ダッシュボードから一時停止または解約できます。
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "決済ページを準備中..." : `${form.plan === "translation" ? "翻訳付き" : "ベーシック"}で決済へ進む`}</Button>
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
