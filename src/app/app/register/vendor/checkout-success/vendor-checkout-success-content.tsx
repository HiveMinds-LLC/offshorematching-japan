"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ConfirmationState = "checking" | "active" | "pending" | "error";

export default function VendorCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConfirmationState>("checking");
  const [message, setMessage] = useState("決済状態を確認しています。");

  useEffect(() => {
    let cancelled = false;

    async function confirmCheckout() {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        if (!cancelled) {
          setState("pending");
          setMessage("決済は完了しています。請求状態の反映に少し時間がかかる場合があります。");
        }
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
        setMessage(payload.error ?? "決済状態の反映に失敗しました。請求セクションを再読み込みしてください。");
        return;
      }

      if (payload.billingAccount?.status === "active") {
        setState("active");
        setMessage("決済が反映されました。会社プロフィールを入力すると自動で掲載が始まります。");
        return;
      }

      setState("pending");
      setMessage("決済は完了しています。請求状態の反映に少し時間がかかる場合があります。");
    }

    void confirmCheckout();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <>
      <h1 className="section-title">決済が完了しました</h1>
      <p className="section-subtitle">
        {state === "active"
          ? "請求状態の反映が完了しました。次に会社プロフィールを整えてください。"
          : "請求状態の反映後に、会社プロフィール入力を進めてください。必須項目が揃うと自動で掲載が始まります。"}
      </p>
      <div
        className={`rounded-2xl border p-4 text-sm ${
          state === "error"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : state === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {message}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app?section=vendor-profile"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          プロフィール入力へ進む
        </Link>
        <Link
          href="/app?section=vendor-billing"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          請求を確認する
        </Link>
        <Button variant="ghost" onClick={() => window.history.back()}>
          前の画面へ戻る
        </Button>
      </div>
    </>
  );
}
