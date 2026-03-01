import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: "Freedom HIRE — Платформа найма в Узбекистане",
  description: "Найдите работу мечты или лучших сотрудников. Тысячи вакансий от реальных компаний Узбекистана.",
  openGraph: {
    title: "Freedom HIRE",
    description: "Платформа найма в Узбекистане",
    siteName: "Freedom HIRE",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
