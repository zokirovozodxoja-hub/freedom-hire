import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Freedom Hire",
  description: "Freedom Hire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#0b1220] text-white">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold">
                FH
              </div>
              <div className="leading-tight">
                <div className="font-semibold">FreedomHIRE</div>
                <div className="text-xs text-white/60">freedomhire.uz</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-white/80">
              <Link className="hover:text-white" href="/jobs">
                Вакансии
              </Link>
              <Link className="hover:text-white" href="/employers">
                Работодателям
              </Link>
              <Link className="hover:text-white" href="/about">
                О нас
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/auth?role=candidate"
                className="rounded-2xl bg-[#7c3aed] px-5 py-2 font-semibold"
              >
                Войти / Регистрация
              </Link>
            </div>
          </div>
        </header>

        {/* PAGE */}
        <main>{children}</main>
      </body>
    </html>
  );
}