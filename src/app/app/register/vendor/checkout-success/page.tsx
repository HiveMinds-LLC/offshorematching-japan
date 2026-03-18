"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VendorCheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId") ?? "";
  const [message, setMessage] = useState("決済確認中...");

  useEffect(() => {
    if (!applicationId) {
      setMessage("申請情報が見つかりませんでした。");
      return;
    }

    void (async () => {
      const response = await fetch("/api/billing/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      });
      if (!response.ok) {
        setMessage("決済完了処理に失敗しました。サポートへご連絡ください。");
        return;
      }
      setMessage("決済を確認しました。次に管理者審査へ進みます。");
    })();
  }, [applicationId]);

  return (
    <div>
      <AppTopbar title="決済完了" subtitle="掲載申請の受付" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <h1 className="section-title">決済が完了しました</h1>
          <p className="section-subtitle">{message}</p>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            掲載料金の月額は <strong>¥5,000</strong> です。申請承認後、公開ディレクトリと開発会社ダッシュボードが利用可能になります。
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              アプリへ戻る
            </Link>
            <Button variant="ghost" onClick={() => window.history.back()}>
              前の画面へ戻る
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
