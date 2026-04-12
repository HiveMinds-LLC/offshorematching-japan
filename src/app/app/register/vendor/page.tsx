"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { TERMS_VERSION } from "@/lib/legal";

type VendorSignupForm = {
  plan: "basic" | "translation";
  name: string;
  country: string;
  contactName: string;
  contactEmail: string;
  password: string;
  preferredLanguage: string;
  acceptedTerms: boolean;
};

const defaults: VendorSignupForm = {
  plan: "basic",
  name: "",
  country: "",
  contactName: "",
  contactEmail: "",
  password: "",
  preferredLanguage: "en",
  acceptedTerms: false
};

export default function VendorRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<VendorSignupForm>(defaults);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);

  const selectedPlan = useMemo(
    () =>
      form.plan === "translation"
        ? {
            title: "翻訳付き",
            price: "¥10,000/月",
            accent: "border-emerald-600 bg-emerald-50",
            points: ["ベーシックの全機能", "日英または会社言語との自動翻訳チャット", "公開プロフィールの日本語翻訳"]
          }
        : {
            title: "ベーシック",
            price: "¥5,000/月",
            accent: "border-blue-600 bg-blue-50",
            points: ["会社掲載", "問い合わせ受信", "通常チャット"]
          },
    [form.plan]
  );

  function validateStepOne() {
    if (!form.name || !form.contactName || !form.contactEmail || !form.password) {
      toast({
        tone: "error",
        title: "基本情報を確認してください",
        description: "会社名・担当者名・連絡先メール・パスワードは必須です。"
      });
      return false;
    }
    if (form.password.length < 8 || !/\d/.test(form.password)) {
      toast({
        tone: "error",
        title: "パスワードを確認してください",
        description: "パスワードは8文字以上かつ数字を1つ以上含めてください。"
      });
      return false;
    }
    return true;
  }

  function validateStepTwo() {
    if (!form.acceptedTerms) {
      toast({
        tone: "error",
        title: "同意が必要です",
        description: "利用規約と月額請求条件への同意が必要です。"
      });
      return false;
    }
    return true;
  }

  async function handleStartCheckout() {
    if (!validateStepOne() || !validateStepTwo()) return;
    setLoading(true);

    const signupResponse = await fetch("/api/vendor-auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        acceptedTerms: true,
        summary: "",
        servicesCsv: "",
        minRate: "0",
        maxRate: "0",
        teamSize: "1",
        english: "basic",
        japaneseSupport: "basic"
      })
    });

    const signupPayload = (await signupResponse.json().catch(() => ({}))) as {
      error?: string;
      requiresEmailConfirmation?: boolean;
    };

    if (!signupResponse.ok) {
      setLoading(false);
      toast({
        tone: "error",
        title: "登録に失敗しました",
        description: signupPayload.error ?? "入力内容をご確認ください。"
      });
      return;
    }

    if (signupPayload.requiresEmailConfirmation) {
      setLoading(false);
      setAwaitingEmailConfirmation(true);
      toast({
        tone: "success",
        title: "登録が完了しました",
        description: "確認メールを送信しました。メール確認後にログインし、請求画面から決済へ進んでください。"
      });
      return;
    }

    const checkoutResponse = await fetch("/api/billing/checkout-session", { method: "POST" });
    const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!checkoutResponse.ok || !checkoutPayload.url) {
      setLoading(false);
      toast({
        tone: "error",
        title: "決済画面を開けませんでした",
        description: checkoutPayload.error ?? "決済設定を確認してください。"
      });
      router.push("/app");
      return;
    }

    window.location.href = checkoutPayload.url;
  }

  return (
    <div>
      <AppTopbar title="開発会社 登録" subtitle="アカウント作成とプラン選択" />
      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8">
        <Card className="grid gap-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => router.back()}>前の画面へ戻る</Button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {[1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${step === index ? "border-slate-900 bg-slate-900 text-white" : step > index ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}
                >
                  {index}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h1 className="section-title">開発会社 登録</h1>
            <p className="section-subtitle">
              まず基本情報でアカウントを作成し、その後プラン決済を行います。決済完了後にダッシュボードへ入り、会社プロフィールを整えると自動で掲載が始まります。
            </p>
          </div>

          {awaitingEmailConfirmation ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <p className="font-semibold text-slate-900">確認メールを送信しました</p>
                <p className="mt-2">
                  現在はメール確認待ちのため、まだ決済へは進めません。メール確認後にログインし、請求画面から決済を開始してください。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push("/app")}>ログイン画面へ</Button>
                <Button variant="ghost" onClick={() => setAwaitingEmailConfirmation(false)}>入力に戻る</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 1 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Step 1: アカウント作成に必要な最小情報を入力します。
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
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className="field-label">パスワード</span>
                  <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  <span className="text-xs text-slate-500">ログインに使う必須パスワードです。8文字以上かつ数字を1つ以上含めてください。</span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { if (validateStepOne()) setStep(2); }}>次へ</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 2 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Step 2: プランと会社言語を選択します。翻訳付きプランでは、この会社言語を基準に翻訳を行います。
              </div>
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
                    <li>チャット自動翻訳</li>
                    <li>公開プロフィールの日本語翻訳</li>
                  </ul>
                </button>
              </div>
              <label className="grid gap-1.5 sm:max-w-sm">
                <span className="field-label">会社言語</span>
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
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>戻る</Button>
                <Button onClick={() => setStep(3)}>確認へ</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 3 ? (
            <div className="grid gap-4">
              <div className={`rounded-2xl border p-5 ${selectedPlan.accent}`}>
                <p className="text-sm font-semibold text-slate-900">選択中プラン</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{selectedPlan.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedPlan.price}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(2)}>プランを変更</Button>
                </div>
                <ul className="mt-4 grid gap-1 text-sm text-slate-700">
                  {selectedPlan.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">この後の流れ</p>
                <ol className="mt-2 grid gap-1">
                  <li>1. アカウントと下書き申請を作成</li>
                  <li>2. 決済画面へ移動</li>
                  <li>3. 決済完了後にアプリへ戻る</li>
                  <li>4. 会社プロフィールを入力し、条件が揃うと掲載開始</li>
                </ol>
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
                  、および <span className="font-semibold">{form.plan === "translation" ? "月額 ¥10,000" : "月額 ¥5,000"}</span> の定期課金に同意します。
                  <span className="mt-1 block text-xs text-slate-500">Terms version: {TERMS_VERSION}</span>
                </span>
              </label>

              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>戻る</Button>
                <Button onClick={() => void handleStartCheckout()} disabled={loading}>
                  {loading ? "決済画面を準備中..." : "決済へ進む"}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
