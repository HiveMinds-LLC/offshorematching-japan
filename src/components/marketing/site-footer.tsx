import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/70">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 md:grid-cols-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg font-extrabold">OffshoreMatch</p>
          <p className="mt-2 text-sm text-slate-600">日本企業向けオフショア開発マッチングSaaS</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">メニュー</p>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            <Link href="/">ホーム</Link>
            <Link href="/pricing">料金</Link>
            <Link href="/hacchuu-kigyou-muke">発注企業向け</Link>
            <Link href="/kaihatsu-kaisha-muke">開発会社向け</Link>
            <Link href="/app">アプリ</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">対応範囲</p>
          <p className="mt-2 text-sm text-slate-600">Web/モバイル開発、PM、クラウド、保守運用</p>
        </div>
      </div>
    </footer>
  );
}
