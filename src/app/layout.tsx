import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ToasterProvider } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "offshoredevelopment.com | 日本企業向けオフショア開発プラットフォーム",
  description: "日本企業向けのオフショア開発会社ディレクトリ、案件マッチング、企業間メッセージをまとめたプラットフォーム"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <ToasterProvider>{children}</ToasterProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
