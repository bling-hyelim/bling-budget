import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomTabs } from "@/components/BottomTabs";

export const metadata: Metadata = {
  title: "블링 가계부",
  description: "개인용 가계부 PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "블링 가계부",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#D85A30",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <div className="mx-auto max-w-phone min-h-dvh pb-28">
          {children}
        </div>
        <BottomTabs />
      </body>
    </html>
  );
}
