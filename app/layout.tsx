import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUUUUUNG",
  description:
    "업로드한 이미지로 펼쳐지는 무한 터널. 아무것도 하지 않는 시간을 기록합니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e5e5e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-mono min-h-dvh">{children}</body>
    </html>
  );
}
