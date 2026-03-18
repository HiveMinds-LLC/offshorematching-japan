import { Suspense } from "react";

import { AppTopbar } from "@/components/app/app-topbar";
import { Card } from "@/components/ui/card";
import VendorCheckoutSuccessContent from "./vendor-checkout-success-content";

export default function VendorCheckoutSuccessPage() {
  return (
    <div>
      <AppTopbar title="決済完了" subtitle="掲載申請の受付" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <Suspense fallback={<VendorCheckoutSuccessFallback />}>
            <VendorCheckoutSuccessContent />
          </Suspense>
        </Card>
      </main>
    </div>
  );
}

function VendorCheckoutSuccessFallback() {
  return (
    <>
      <h1 className="section-title">決済が完了しました</h1>
      <p className="section-subtitle">決済確認中...</p>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        掲載料金の月額は <strong>¥5,000</strong> です。申請承認後、公開ディレクトリと開発会社ダッシュボードが利用可能になります。
      </div>
    </>
  );
}