import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { LEGAL_BUSINESS_INFO, TERMS_VERSION } from "@/lib/legal";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default function CommercialTransactionsPage() {
  return (
    <LegalPageShell
      eyebrow="COMMERCIAL DISCLOSURE"
      title="特定商取引法に基づく表記"
      subtitle={`月額課金型の掲載サービスに関する表記です。価格はすべて税込です。版: ${TERMS_VERSION}`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Row label="販売事業者" value={LEGAL_BUSINESS_INFO.companyName} />
        <Row label="代表責任者" value={LEGAL_BUSINESS_INFO.representativeName} />
        <Row label="所在地・電話番号" value="請求があった場合には、遅滞なく電子メールにより提供します。" />
        <Row label="メールアドレス" value={LEGAL_BUSINESS_INFO.supportEmail} />
        <Row label="販売価格" value="開発会社掲載料：ベーシックプラン 月額5,000円／翻訳付きプラン 月額10,000円" />
        <Row label="商品代金以外の必要料金" value="インターネット接続料金、通信料金、振込手数料等は利用者負担" />
        <Row label="支払方法" value="クレジットカード決済" />
        <Row label="支払時期" value="初回は申込時、以後は1か月ごとの自動更新時" />
        <Row label="役務提供時期" value="決済確認後、必須プロフィール項目の入力が完了すると掲載アカウントを有効化" />
        <Row label="契約期間" value="1か月単位の自動更新" />
        <Row label="中途解約" value="ダッシュボードまたは請求ポータルから停止・解約申請可能" />
      </div>

      <section className="grid gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">停止・解約・返金</h2>
        <p>次回更新日前までに停止または解約手続が完了した場合、次回以降の請求を停止します。</p>
        <p>当月分について日割返金を行うかどうかは実運用に応じて確定してください。本ドラフトでは原則返金なしの前提です。</p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">販売条件に関する補足</h2>
        <p>掲載開始には、料金支払完了に加え、必須プロフィール項目の入力完了が必要です。掲載停止条件、禁止事項、モデレーション方針は利用規約に従います。</p>
      </section>
    </LegalPageShell>
  );
}
