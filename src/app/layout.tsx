import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ExamFilterProvider } from "@/lib/exam-filter-context";

export const metadata: Metadata = {
  title: "KoçDefterim",
  description: "Eğitim koçları için öğrenci takip ve yönetim paneli",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KoçDefterim",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KoçDefterim" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <ExamFilterProvider>
          {children}
        </ExamFilterProvider>
      </body>
    </html>
  );
}