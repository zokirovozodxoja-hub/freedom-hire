"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/jobs", label: "Вакансии" },
  { href: "/employers", label: "Работодателям" },
  { href: "/about", label: "О нас" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-bold">
            FH
          </div>
          <div className="leading-tight">
            <div className="font-semibold">FreedomHIRE</div>
            <div className="text-xs text-white/60">freedomhire.uz</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-white/80 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "text-white" : "hover:text-white"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/auth" className="rounded-2xl bg-[#7c3aed] px-5 py-2 font-semibold">
          Войти
        </Link>
      </div>
    </header>
  );
}
