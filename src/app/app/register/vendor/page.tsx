"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { locale } = useLocale();
  const { toast } = useToast();
  const [form, setForm] = useState<VendorSignupForm>(defaults);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);

  const selectedPlan = useMemo(
    () =>
      form.plan === "translation"
        ? {
            title: locale === "ja" ? "翻訳付き" : "Translation",
            price: locale === "ja" ? "¥10,000/月" : "JPY 10,000 / month",
            accent: "border-emerald-600 bg-emerald-50",
            points: locale === "ja"
              ? ["ベーシックの全機能", "日英または会社言語との自動翻訳チャット", "公開プロフィールの日本語翻訳"]
              : ["Everything in Standard", "Auto-translated chat between Japanese and the company language", "Japanese translation for the public profile"]
          }
        : {
            title: locale === "ja" ? "ベーシック" : "Standard",
            price: locale === "ja" ? "¥5,000/月" : "JPY 5,000 / month",
            accent: "border-blue-600 bg-blue-50",
            points: locale === "ja"
              ? ["会社掲載", "問い合わせ受信", "通常チャット"]
              : ["Marketplace listing", "Inbound buyer inquiries", "Standard chat"]
          },
    [form.plan, locale]
  );

  function validateStepOne() {
    if (!form.name || !form.contactName || !form.contactEmail || !form.password) {
      toast({
        tone: "error",
        title: locale === "ja" ? "基本情報を確認してください" : "Check the required details",
        description: locale === "ja" ? "会社名・担当者名・連絡先メール・パスワードは必須です。" : "Company name, contact name, contact email, and password are required."
      });
      return false;
    }
    if (form.password.length < 8 || !/\d/.test(form.password)) {
      toast({
        tone: "error",
        title: locale === "ja" ? "パスワードを確認してください" : "Check the password",
        description: locale === "ja" ? "パスワードは8文字以上かつ数字を1つ以上含めてください。" : "Use at least 8 characters and include at least 1 number."
      });
      return false;
    }
    return true;
  }

  function validateStepTwo() {
    if (!form.acceptedTerms) {
      toast({
        tone: "error",
        title: locale === "ja" ? "同意が必要です" : "Agreement required",
        description: locale === "ja" ? "利用規約と月額請求条件への同意が必要です。" : "You need to agree to the terms and recurring billing."
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
        title: locale === "ja" ? "登録に失敗しました" : "Registration failed",
        description: signupPayload.error ?? (locale === "ja" ? "入力内容をご確認ください。" : "Please review the information and try again.")
      });
      return;
    }

    if (signupPayload.requiresEmailConfirmation) {
      setLoading(false);
      setAwaitingEmailConfirmation(true);
      toast({
        tone: "success",
        title: locale === "ja" ? "登録が完了しました" : "Registration complete",
        description: locale === "ja" ? "確認メールを送信しました。メール確認後にログインし、請求画面から決済へ進んでください。" : "We sent a confirmation email. After confirming your email, sign in and continue to billing from the payment section."
      });
      return;
    }

    const checkoutResponse = await fetch("/api/billing/checkout-session", { method: "POST" });
    const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!checkoutResponse.ok || !checkoutPayload.url) {
      setLoading(false);
      toast({
        tone: "error",
        title: locale === "ja" ? "決済画面を開けませんでした" : "Could not open the payment page",
        description: checkoutPayload.error ?? (locale === "ja" ? "決済設定を確認してください。" : "Please check the billing setup.")
      });
      router.push("/app");
      return;
    }

    window.location.href = checkoutPayload.url;
  }

  return (
    <div>
      <AppTopbar
        title={locale === "ja" ? "開発会社 登録" : "Vendor Sign Up"}
        subtitle={locale === "ja" ? "アカウント作成とプラン選択" : "Account setup and plan selection"}
      />
      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8">
        <Card className="grid gap-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => router.back()}>{locale === "ja" ? "前の画面へ戻る" : "Go Back"}</Button>
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
            <h1 className="section-title">{locale === "ja" ? "開発会社 登録" : "Vendor Sign Up"}</h1>
            <p className="section-subtitle">
              {locale === "ja"
                ? "まず基本情報でアカウントを作成し、その後プラン決済を行います。決済完了後にダッシュボードへ入り、会社プロフィールを整えると自動で掲載が始まります。"
                : "Start by creating the account with the basic details, then complete plan checkout. After payment, finish the company profile in the dashboard and the listing will go live automatically."}
            </p>
          </div>

          {awaitingEmailConfirmation ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <p className="font-semibold text-slate-900">{locale === "ja" ? "確認メールを送信しました" : "Confirmation email sent"}</p>
                <p className="mt-2">
                  {locale === "ja"
                    ? "現在はメール確認待ちのため、まだ決済へは進めません。メール確認後にログインし、請求画面から決済を開始してください。"
                    : "Payment cannot start yet because the email confirmation is still pending. After confirming your email, sign in and start payment from the billing section."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push("/app")}>{locale === "ja" ? "ログイン画面へ" : "Go to Sign In"}</Button>
                <Button variant="ghost" onClick={() => setAwaitingEmailConfirmation(false)}>{locale === "ja" ? "入力に戻る" : "Back to Form"}</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 1 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {locale === "ja" ? "Step 1: アカウント作成に必要な最小情報を入力します。" : "Step 1: Enter the minimum details needed to create the account."}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="field-label">{locale === "ja" ? "会社名" : "Company Name"}</span>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">{locale === "ja" ? "国" : "Country"}</span>
                  <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">{locale === "ja" ? "担当者名" : "Contact Name"}</span>
                  <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">{locale === "ja" ? "連絡先メール" : "Contact Email"}</span>
                  <Input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                </label>
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className="field-label">{locale === "ja" ? "パスワード" : "Password"}</span>
                  <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  <span className="text-xs text-slate-500">{locale === "ja" ? "ログインに使う必須パスワードです。8文字以上かつ数字を1つ以上含めてください。" : "This password will be used for sign-in. Use at least 8 characters and include at least 1 number."}</span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { if (validateStepOne()) setStep(2); }}>{locale === "ja" ? "次へ" : "Next"}</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 2 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {locale === "ja" ? "Step 2: プランと会社言語を選択します。翻訳付きプランでは、この会社言語を基準に翻訳を行います。" : "Step 2: Choose the plan and the company language. The translation plan uses this language as the translation target."}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, plan: "basic" }))}
                  className={`rounded-2xl border p-5 text-left transition ${form.plan === "basic" ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "ベーシック" : "Standard"}</p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">¥5,000<span className="ml-1 text-sm font-semibold text-slate-500">{locale === "ja" ? "/月" : "/month"}</span></p>
                  <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                    <li>{locale === "ja" ? "会社掲載" : "Marketplace listing"}</li>
                    <li>{locale === "ja" ? "問い合わせ受信" : "Inbound buyer inquiries"}</li>
                    <li>{locale === "ja" ? "通常チャット" : "Standard chat"}</li>
                  </ul>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, plan: "translation" }))}
                  className={`rounded-2xl border p-5 text-left transition ${form.plan === "translation" ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "翻訳付き" : "Translation"}</p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">¥10,000<span className="ml-1 text-sm font-semibold text-slate-500">{locale === "ja" ? "/月" : "/month"}</span></p>
                  <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                    <li>{locale === "ja" ? "ベーシックの全機能" : "Everything in Standard"}</li>
                    <li>{locale === "ja" ? "チャット自動翻訳" : "Auto-translated chat"}</li>
                    <li>{locale === "ja" ? "公開プロフィールの日本語翻訳" : "Japanese translation for the public profile"}</li>
                  </ul>
                </button>
              </div>
              <label className="grid gap-1.5 sm:max-w-sm">
                <span className="field-label">{locale === "ja" ? "会社言語" : "Company Language"}</span>
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
                <Button variant="ghost" onClick={() => setStep(1)}>{locale === "ja" ? "戻る" : "Back"}</Button>
                <Button onClick={() => setStep(3)}>{locale === "ja" ? "確認へ" : "Review"}</Button>
              </div>
            </div>
          ) : null}

          {!awaitingEmailConfirmation && step === 3 ? (
            <div className="grid gap-4">
              <div className={`rounded-2xl border p-5 ${selectedPlan.accent}`}>
                <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "選択中プラン" : "Selected Plan"}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{selectedPlan.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedPlan.price}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(2)}>{locale === "ja" ? "プランを変更" : "Change Plan"}</Button>
                </div>
                <ul className="mt-4 grid gap-1 text-sm text-slate-700">
                  {selectedPlan.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{locale === "ja" ? "この後の流れ" : "What Happens Next"}</p>
                <ol className="mt-2 grid gap-1">
                  <li>{locale === "ja" ? "1. アカウントを作成" : "1. Create the account"}</li>
                  <li>{locale === "ja" ? "2. 決済画面へ移動" : "2. Go to the payment page"}</li>
                  <li>{locale === "ja" ? "3. 決済完了後にアプリへ戻る" : "3. Return to the app after payment"}</li>
                  <li>{locale === "ja" ? "4. 会社プロフィールを入力し、条件が揃うと掲載開始" : "4. Complete the company profile and the listing goes live once the required fields are ready"}</li>
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
                  <Link href="/legal/terms" className="font-semibold text-blue-700 underline underline-offset-2">{locale === "ja" ? "利用規約" : "Terms of Service"}</Link>
                  {locale === "ja" ? "、" : ", "}
                  <Link href="/legal/privacy" className="font-semibold text-blue-700 underline underline-offset-2">{locale === "ja" ? "プライバシーポリシー" : "Privacy Policy"}</Link>
                  {locale === "ja"
                    ? <>、および <span className="font-semibold">{form.plan === "translation" ? "月額 ¥10,000" : "月額 ¥5,000"}</span> の定期課金に同意します。</>
                    : <> and the recurring billing of <span className="font-semibold">{form.plan === "translation" ? "JPY 10,000 / month" : "JPY 5,000 / month"}</span>.</>}
                  <span className="mt-1 block text-xs text-slate-500">Terms version: {TERMS_VERSION}</span>
                </span>
              </label>

              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>{locale === "ja" ? "戻る" : "Back"}</Button>
                <Button onClick={() => void handleStartCheckout()} disabled={loading}>
                  {loading ? (locale === "ja" ? "決済画面を準備中..." : "Preparing payment...") : (locale === "ja" ? "決済へ進む" : "Continue to Payment")}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
