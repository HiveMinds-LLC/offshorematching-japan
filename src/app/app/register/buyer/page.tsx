"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BuyerSignupForm = {
  companyName: string;
  industry: string;
  contactName: string;
  email: string;
  password: string;
};

const defaults: BuyerSignupForm = {
  companyName: "",
  industry: "",
  contactName: "",
  email: "",
  password: ""
};

export default function BuyerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<BuyerSignupForm>(defaults);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.companyName || !form.email || form.password.length < 6) {
      setMessage("会社名・メール・6文字以上のパスワードを入力してください。");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error ?? "登録に失敗しました。");
      return;
    }
    setMessage("登録が完了しました。ログイン画面へ移動します。");
    setForm(defaults);
    setTimeout(() => router.push("/app"), 800);
  }

  return (
    <div>
      <AppTopbar title="発注企業 登録" subtitle="新規アカウント作成" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <div>
            <Button variant="ghost" onClick={() => router.back()}>前の画面へ戻る</Button>
          </div>
          <h1 className="section-title">発注企業 新規登録</h1>
          <p className="section-subtitle">登録後、/app のログインタブからサインインしてください。</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">会社名</span>
              <Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">業界</span>
              <Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">担当者名</span>
              <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">メール</span>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
          </div>
          <label className="grid gap-1.5 sm:max-w-sm">
            <span className="field-label">パスワード</span>
            <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "登録中..." : "登録する"}</Button>
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
