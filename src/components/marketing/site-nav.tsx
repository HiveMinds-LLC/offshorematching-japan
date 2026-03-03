import Link from "next/link";

const navItems = [
  { href: "/", label: "ホーム" },
  { href: "/pricing", label: "料金" },
  { href: "/hacchuu-kigyou-muke", label: "発注企業向け" },
  { href: "/kaihatsu-kaisha-muke", label: "開発会社向け" }
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
          OffshoreMatch
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/pricing" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
            料金を見る
          </Link>
          <Link href="/app" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            アプリ
          </Link>
        </div>
      </div>
    </header>
  );
}
