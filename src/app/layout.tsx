import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_JP, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-jp",
  weight: ["400", "500", "700", "900"]
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "800"]
});

export const metadata: Metadata = {
  title: "OffshoreMatch | 日本企業向け開発マッチングSaaS",
  description: "日本企業向けのオフショア開発会社マッチングSaaSプロトタイプ"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSans.variable} ${jakarta.variable} font-[family-name:var(--font-jp)]`}>{children}</body>
    </html>
  );
}
