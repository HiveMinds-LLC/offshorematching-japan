import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OffshoreMatch | 日本企業向け開発マッチングSaaS",
  description: "日本企業向けのオフショア開発会社マッチングSaaSプロトタイプ"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
