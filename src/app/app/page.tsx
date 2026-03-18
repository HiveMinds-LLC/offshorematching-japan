"use client";

import { AppTopbar } from "@/components/app/app-topbar";
import { useLocale } from "@/components/i18n/locale-provider";
import { OffshoreMatchApp } from "@/components/offshorematch-app";

export default function AppPage() {
  const { locale } = useLocale();
  return (
    <div>
      <AppTopbar title={locale === "ja" ? "アプリ" : "App"} subtitle={locale === "ja" ? "マーケットプレイス・ログイン・マッチング" : "Marketplace, login, and matching"} />
      <main>
        <OffshoreMatchApp />
      </main>
    </div>
  );
}
