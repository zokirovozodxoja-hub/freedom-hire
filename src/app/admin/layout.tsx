"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"]; // ← замени на свой email

const NAV = [
  { href: "/admin", label: "📊 Статистика" },
  { href: "/admin/jobs", label: "💼 Вакансии" },
  { href: "/admin/companies", label: "🏢 Компании" },
  { href: "/admin/users", label: "👥 Пользователи" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || !ADMIN_EMAILS.includes(email)) {
        router.replace("/");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center text-white">
        Проверка доступа...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex">
      {/* Сайдбар */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-white/3 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="font-black text-lg">FH Admin</div>
          <div className="text-xs text-white/40 mt-0.5">Панель управления</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#7c3aed] text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            ← На сайт
          </Link>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
