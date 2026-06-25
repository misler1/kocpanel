import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
