import Link from "next/link";
import type { ReactNode } from "react";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { LEGAL_PLACEHOLDERS, TERMS_VERSION } from "@/lib/legal";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="TERMS OF SERVICE"
      title="利用規約"
      subtitle={`本規約は OffshoreMatch の利用条件を定める基本ドラフトです。公開前に、${LEGAL_PLACEHOLDERS.companyName} の実在情報へ差し替えたうえで弁護士確認を行ってください。版: ${TERMS_VERSION}`}
    >
      <Section title="1. 適用範囲">
        <p>本規約は、{LEGAL_PLACEHOLDERS.companyName}（以下「当社」）が提供する OffshoreMatch および関連サービスの利用に適用されます。</p>
        <p>発注企業、開発会社、その他本サービスへアクセスする全ての利用者は、本規約に同意のうえで利用するものとします。</p>
      </Section>

      <Section title="2. サービス内容">
        <p>本サービスは、日本企業とオフショア開発会社の比較、掲載、マッチング、メッセージ連絡および関連情報の提供を行うプラットフォームです。</p>
        <p>当社は、案件の成約、成果物品質、契約履行、支払回収、知的財産の帰属その他個別取引の当事者にはなりません。</p>
      </Section>

      <Section title="3. アカウント">
        <p>利用者は、真実かつ正確な情報を登録し、常に最新の状態に保つものとします。</p>
        <p>ログイン情報の管理責任は利用者自身にあります。不正使用の疑いがある場合、直ちに当社へ通知してください。</p>
      </Section>

      <Section title="4. 開発会社掲載と料金">
        <p>開発会社による掲載は、所定の月額料金の支払完了と必須プロフィール項目の入力完了を条件として有効化されます。</p>
        <p>標準掲載料金は月額5,000円（税込表示の要否は実運用に応じて確定）です。詳細な販売条件は <Link href="/legal/commercial-transactions" className="font-semibold text-blue-700 underline underline-offset-2">特定商取引法に基づく表記</Link> に定めます。</p>
      </Section>

      <Section title="5. 禁止事項">
        <p>利用者は、虚偽情報の登録、第三者の権利侵害、法令違反、スパム行為、当社システムへの不正アクセス、マルウェア送信、差別的または違法な内容の送信を行ってはなりません。</p>
        <p>当社は、禁止事項違反があると判断した場合、アカウント停止、掲載停止、情報削除その他必要な措置を行うことができます。</p>
      </Section>

      <Section title="6. マッチング・メッセージ機能">
        <p>当社は、検索、スコアリング、AI補助その他の仕組みにより候補会社を提示しますが、その完全性・正確性・適合性を保証しません。</p>
        <p>翻訳表示や要件整理結果は参考情報であり、最終的な契約条件、仕様確認、法務確認は当事者間で行うものとします。</p>
      </Section>

      <Section title="7. 知的財産">
        <p>本サービス自体に関する著作権、商標権その他の権利は、当社または正当な権利者に帰属します。</p>
        <p>利用者が本サービスへ投稿した情報について、当社はサービス運営、表示、検索最適化、問い合わせ対応、モデレーションのために必要な範囲で利用できるものとします。</p>
      </Section>

      <Section title="8. 免責">
        <p>当社は、本サービスの中断、停止、外部サービス障害、データ消失、候補会社情報の誤り、個別商談の不成立、品質不一致等によって生じた損害について、当社に故意または重過失がある場合を除き責任を負いません。</p>
      </Section>

      <Section title="9. 退会・停止">
        <p>利用者は、当社所定の方法により退会できます。開発会社の掲載課金停止または解約は、ダッシュボードまたは請求ポータルから申請できます。</p>
        <p>既に発生した料金、法令上保存が必要なデータ、取引記録については、退会後も当社が保持する場合があります。</p>
      </Section>

      <Section title="10. 準拠法・管轄">
        <p>本規約は日本法に準拠します。本サービスに関連して当社と利用者との間で紛争が生じた場合、当社本店所在地を管轄する裁判所を第一審の専属的合意管轄とします。</p>
      </Section>
    </LegalPageShell>
  );
}
