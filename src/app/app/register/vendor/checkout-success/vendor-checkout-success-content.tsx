"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

type ConfirmationState = "checking" | "active" | "pending" | "error";

export default function VendorCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [state, setState] = useState<ConfirmationState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirmCheckout() {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        if (!cancelled) setState("pending");
        return;
      }

      const response = await fetch("/api/billing/checkout-session/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        billingAccount?: { status?: string };
      };

      if (cancelled) return;

      if (!response.ok) {
        setState("error");
        setErrorMessage(payload.error ?? "");
        return;
      }

      setState(payload.billingAccount?.status === "active" ? "active" : "pending");
    }

    void confirmCheckout();
    return () => { cancelled = true; };
  }, [searchParams]);

  const statusMessage = (() => {
    if (state === "checking") return locale === "ja" ? "決済状態を確認しています。" : "Checking payment status…";
    if (state === "active") return locale === "ja" ? "決済が反映されました。会社プロフィールを入力すると自動で掲載が始まります。" : "Payment confirmed. Complete your company profile and your listing will go live automatically.";
    if (state === "error") return errorMessage || (locale === "ja" ? "決済状態の反映に失敗しました。請求セクションを再読み込みしてください。" : "Could not confirm payment status. Please reload the billing section.");
    return locale === "ja" ? "決済は完了しています。請求状態の反映に少し時間がかかる場合があります。" : "Payment is complete. It may take a moment for billing status to update.";
  })();

  return (
    <>
      <h1 className="section-title">{locale === "ja" ? "決済が完了しました" : "Payment complete"}</h1>
      <p className="section-subtitle">
        {state === "active"
          ? (locale === "ja" ? "請求状態の反映が完了しました。次に会社プロフィールを整えてください。" : "Billing is confirmed. Next, fill in your company profile.")
          : (locale === "ja" ? "請求状態の反映後に、会社プロフィール入力を進めてください。必須項目が揃うと自動で掲載が始まります。" : "Once billing is confirmed, complete your profile. Your listing goes live automatically when all required fields are filled.")}
      </p>
      <div className={`rounded-2xl border p-4 text-sm ${state === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        {statusMessage}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/app?section=vendor-profile" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {locale === "ja" ? "プロフィール入力へ進む" : "Go to profile"}
        </Link>
        <Link href="/app?section=vendor-billing" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {locale === "ja" ? "請求を確認する" : "View billing"}
        </Link>
        <Button variant="ghost" onClick={() => window.history.back()}>
          {locale === "ja" ? "前の画面へ戻る" : "Go back"}
        </Button>
      </div>
    </>
  );
}
