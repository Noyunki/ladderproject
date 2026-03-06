import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Random Selector",
  description: "팀에서 메뉴, 순서, 역할을 빠르게 정하는 랜덤 선택기"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
