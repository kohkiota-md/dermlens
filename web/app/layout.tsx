import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DermLens AI — 皮膚病変トリアージ支援",
  description:
    "DenseNet-121によるダーモスコピー画像の7疾患分類。皮膚科専門医が開発した臨床コンテキスト付きAIトリアージツール。本ツールは診断ツールではありません。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
