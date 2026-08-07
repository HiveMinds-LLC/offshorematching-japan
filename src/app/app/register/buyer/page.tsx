"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";

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

function isValidBuyerPassword(password: string) {
  return password.length >= 8 && /\d/.test(password);
}

export default function BuyerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useLocale();
  const [form, setForm] = useState<BuyerSignupForm>(defaults);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.companyName || !form.email || !isValidBuyerPassword(form.password)) {
      toast({
        tone: "error",
        title: locale === "ja" ? "登録内容を確認してください" : "Please check your details",
        description: locale === "ja"
          ? "会社名・メール・8文字以上かつ数字を1つ以上含むパスワードを入力してください。"
          : "Company name, email, and a password of at least 8 characters including a number are required."
      });
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; requiresEmailConfirmation?: boolean };
    setLoading(false);
    if (!response.ok) {
      toast({
        tone: "error",
        title: locale === "ja" ? "登録に失敗しました" : "Registration failed",
        description: payload.error ?? (locale === "ja" ? "入力内容をご確認ください。" : "Please check your input.")
      });
      return;
    }
    toast({
      tone: "success",
      title: locale === "ja" ? "登録が完了しました" : "Registration complete",
      description: payload.requiresEmailConfirmation
        ? (locale === "ja" ? "確認メールの案内に従って認証した後、ログインしてください。" : "Please verify your email before logging in.")
        : (locale === "ja" ? "ログイン画面へ移動します。" : "Redirecting to login.")
    });
    setForm(defaults);
    setTimeout(() => router.push("/app"), 800);
  }

  return (
    <div>
      <AppTopbar title="発注企業 登録" titleEn="Buyer Registration" subtitle="新規アカウント作成" subtitleEn="Create a new account" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <div>
            <Button variant="ghost" onClick={() => router.back()}>{locale === "ja" ? "前の画面へ戻る" : "Go back"}</Button>
          </div>
          <h1 className="section-title">{locale === "ja" ? "発注企業 新規登録" : "Register as a Buyer"}</h1>
          <p className="section-subtitle">{locale === "ja" ? "登録後、このメールアドレスとパスワードで /app からログインします。" : "After registration, log in at /app with this email and password."}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "ja" ? "会社名" : "Company name"}</span>
              <Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "ja" ? "業界" : "Industry"}</span>
              <Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "ja" ? "担当者名" : "Contact name"}</span>
              <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{locale === "ja" ? "メール" : "Email"}</span>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
          </div>
          <label className="grid gap-1.5 sm:max-w-sm">
            <span className="field-label">{locale === "ja" ? "パスワード" : "Password"}</span>
            <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            <span className="text-xs leading-6 text-slate-500">
              {locale === "ja" ? "8文字以上で、数字を1つ以上含めてください。ログイン時にもこのパスワードを使用します。" : "At least 8 characters including one number. You will use this password to log in."}
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} disabled={loading}>{loading ? (locale === "ja" ? "登録中..." : "Registering...") : (locale === "ja" ? "登録する" : "Register")}</Button>
            <Link href="/app" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {locale === "ja" ? "ログインへ戻る" : "Back to login"}
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
