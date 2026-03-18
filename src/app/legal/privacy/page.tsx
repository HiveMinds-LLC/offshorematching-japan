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

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="PRIVACY POLICY"
      title="プライバシーポリシー"
      subtitle={`本ポリシーは APPI を意識した基本ドラフトです。${LEGAL_PLACEHOLDERS.companyName} の実際の運用、委託先、保存期間、問い合わせ窓口へ合わせて最終調整してください。版: ${TERMS_VERSION}`}
    >
      <Section title="1. 取得する情報">
        <p>当社は、アカウント情報、会社情報、担当者情報、公開プロフィール情報、請求関連情報、問い合わせ履歴、メッセージ内容、アクセスログ、端末情報等を取得する場合があります。</p>
      </Section>

      <Section title="2. 利用目的">
        <p>取得した情報は、本人確認、アカウント管理、掲載審査、候補会社提示、メッセージ機能提供、請求処理、障害対応、不正利用防止、サポート対応、法令対応、サービス改善のために利用します。</p>
      </Section>

      <Section title="3. 第三者提供">
        <p>当社は、法令に基づく場合を除き、本人同意なく個人データを第三者へ提供しません。</p>
        <p>ただし、決済代行、クラウド基盤、認証、分析、通知、翻訳その他サービス運営上必要な範囲で、委託先へ情報を取り扱わせることがあります。</p>
      </Section>

      <Section title="4. 外部サービス">
        <p>当社は、決済のため Stripe、データ保存・認証・リアルタイム機能のため Supabase 等の外部サービスを利用することがあります。</p>
        <p>外部サービスにおける情報取扱いは各事業者のポリシーにも従います。</p>
      </Section>

      <Section title="5. 国外移転の可能性">
        <p>本サービスはオフショア開発会社を扱うため、利用者が入力・送信した情報が、日本国外に所在する開発会社、委託先、クラウド事業者、翻訳・AI提供事業者へ送信または保存される場合があります。</p>
      </Section>

      <Section title="6. 安全管理措置">
        <p>当社は、アクセス制御、認証、通信暗号化、権限管理、ログ監視、委託先管理その他合理的な安全管理措置を講じます。</p>
      </Section>

      <Section title="7. 開示等の請求">
        <p>利用者は、当社所定の方法により、保有個人データの開示、訂正、削除、利用停止等を請求できます。本人確認後、法令に従って対応します。</p>
      </Section>

      <Section title="8. お問い合わせ窓口">
        <p>事業者名: {LEGAL_PLACEHOLDERS.companyName}</p>
        <p>担当: {LEGAL_PLACEHOLDERS.representativeName}</p>
        <p>メール: {LEGAL_PLACEHOLDERS.supportEmail}</p>
        <p>電話: {LEGAL_PLACEHOLDERS.supportPhone}</p>
      </Section>
    </LegalPageShell>
  );
}
