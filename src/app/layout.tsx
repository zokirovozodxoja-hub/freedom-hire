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
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;700&family=Syne:wght@800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="brand-grid">
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
