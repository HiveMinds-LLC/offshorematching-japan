import { AppTopbar } from "@/components/app/app-topbar";
import { OffshoreMatchApp } from "@/components/offshorematch-app";

export default function AppPage() {
  return (
    <div>
      <AppTopbar title="アプリ" subtitle="マーケットプレイス・ログイン・マッチング" />
      <main>
        <OffshoreMatchApp />
      </main>
    </div>
  );
}
