import Link from "next/link";

import { AppTopbar } from "@/components/app/app-topbar";
import { Card } from "@/components/ui/card";

export default function VendorCheckoutCancelPage() {
  return (
    <div>
      <AppTopbar title="決済未完了" subtitle="掲載準備の続き" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8">
        <Card className="grid gap-4 p-6">
          <h1 className="section-title">決済はまだ完了していません</h1>
          <p className="section-subtitle">掲載を開始するには、選択したベンダープランの月額決済完了が必要です。</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/app?section=vendor-billing" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              請求へ戻る
            </Link>
            <Link href="/app" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              アプリへ戻る
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
