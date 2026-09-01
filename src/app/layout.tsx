import type { Metadata } from "next";
import "./globals.css";
import { ExamFilterProvider } from "@/lib/exam-filter-context";

export const metadata: Metadata = {
  title: "KoçPanel",
  description: "Eğitim koçları için öğrenci takip ve yönetim paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <ExamFilterProvider>
          {children}
        </ExamFilterProvider>
      </body>
    </html>
  );
}