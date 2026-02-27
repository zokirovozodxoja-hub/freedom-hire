import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: "Freedom Hire",
  description: "Freedom Hire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#0b1220] text-white">
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
