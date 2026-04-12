import { AppTopbar } from "@/components/app/app-topbar";

export default function AppLoading() {
  return (
    <div>
      <AppTopbar title="アプリ" titleEn="App" subtitle="読み込み中" subtitleEn="Loading" />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4 py-12">
        <div className="grid justify-items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <p className="text-sm font-medium text-slate-600">Loading workspace...</p>
        </div>
      </main>
    </div>
  );
}
