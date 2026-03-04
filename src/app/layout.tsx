import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";
import { I18nProvider } from "@/i18n/context";

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
 <I18nProvider>
      <SiteHeader />
      <main>{children}</main>
      <footer style={{ borderTop: "1px solid rgba(196,173,255,0.08)", background: "rgba(7,6,15,0.9)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span style={{ color: "rgba(255,255,255,0.35)" }} className="text-sm">© 2025 FreedomHIRE · freedomhire.uz</span>
          <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            <a href="/about" className="hover:text-white transition" style={{ color: "inherit" }}>О нас</a>
            <a href="/jobs" className="hover:text-white transition" style={{ color: "inherit" }}>Вакансии</a>
            <a href="/employers" className="hover:text-white transition" style={{ color: "inherit" }}>Работодателям</a>
          </div>
        </div>
      </footer>
    </I18nProvider>
 </body>
 </html>
 );
}
