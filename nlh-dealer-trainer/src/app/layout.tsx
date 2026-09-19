import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NLH Dealer Trainer",
  description: "ノーリミットホールデムのディーラー訓練: 役の読み取り・勝者判定・ポット計算・サイドポット計算",
  applicationName: "NLH Dealer Trainer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f3d2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
