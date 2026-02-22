export function AdSidebar() {
  return (
    <aside className="grid gap-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500">OFFICIAL</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">OffshoreMatch 公式支援</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">要件整理テンプレート配布中。失敗しない外注選定ガイド（PDF）。</p>
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-2 py-4 text-center text-[11px] text-slate-500">広告画像枠 300x250</div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500">SPONSORED</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">スポンサー広告枠 A</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">掲載例: 開発会社の得意領域訴求、採用強化、資料DL導線。</p>
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-2 py-4 text-center text-[11px] text-slate-500">広告画像枠 300x250</div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500">SPONSORED</p>
        <h3 className="mt-1 text-sm font-bold text-slate-900">スポンサー広告枠 B</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">広告販売用プレースホルダ。CV重視のLPへ遷移可能。</p>
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-2 py-4 text-center text-[11px] text-slate-500">広告画像枠 300x250</div>
      </article>
    </aside>
  );
}
