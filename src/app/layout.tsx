import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ExamFilterProvider } from "@/lib/exam-filter-context";
import { SITE_URL } from "@/lib/site";
import { PwaRegister } from "@/components/PwaRegister";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Suspense } from "react";

export const metadata: Metadata = {
  // Göreli canonical/og adresleri bu adrese göre tam adrese çevrilir
  metadataBase: new URL(SITE_URL),
  title: "Koç Defterim | YKS ve LGS Öğrenci Koçluğu",
  description: "Koç Defterim (KoçDefterim): YKS ve LGS öğrencileri için eğitim koçluğu, haftalık çalışma takibi, deneme analizi ve veli bilgilendirmesi.",
  applicationName: "KoçDefterim",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Koç Defterim",
  },
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
  themeColor: "#1B4A8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KoçDefterim" />
        {/* Koyu tema tercihi sayfa çizilmeden uygulanır (src/components/ThemeToggle.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('kd:theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <PwaRegister />
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <ExamFilterProvider>
          {children}
        </ExamFilterProvider>
      </body>
    </html>
  );
}