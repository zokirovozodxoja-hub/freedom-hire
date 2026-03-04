"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

const NAV = [
 { href: "/admin", label: " Статистика" },
 { href: "/admin/jobs", label: " Вакансии" },
 { href: "/admin/companies", label: " Компании" },
 { href: "/admin/users", label: " Пользователи" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 const pathname = usePathname();
 const [checking, setChecking] = useState(true);
 const [adminEmail, setAdminEmail] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 const supabase = createClient();
 const { data } = await supabase.auth.getUser();
 const email = data.user?.email;

 if (!email || !ADMIN_EMAILS.includes(email)) {
 router.replace("/");
 return;
 }
 setAdminEmail(email);
 setChecking(false);
 })();
 }, [router]);

 async function handleLogout() {
 const supabase = createClient();
 await supabase.auth.signOut();
 router.replace("/");
 }

 if (checking) {
 return (
 <div className="min-h-screen flex items-center justify-center text-white/50 text-sm" style={{ background: "var(--ink)" }}>
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 rounded-full border-2 animate-spin"
 style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
 <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Проверка доступа...</div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen text-white flex" style={{ background: "var(--ink)" }}>
 {/* Сайдбар */}
 <aside className="w-56 shrink-0 border-r border-white/10 bg-white/3 flex flex-col">
 <div className="p-5 border-b border-white/10">
 <div className="font-black text-lg">FH Admin</div>
 <div className="text-xs text-white/40 mt-0.5">Панель управления</div>
 {adminEmail && (
 <div className="text-xs mt-1 truncate" style={{ color: "var(--lavender)" }}>{adminEmail}</div>
 )}
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
 ? "text-white"
 : "text-white/70 hover:bg-white/8 hover:text-white"
 }`}
 style={active ? { background: "var(--brand-core)" } : undefined}
 >
 {item.label}
 </Link>
 );
 })}
 </nav>
 <div className="p-3 border-t border-white/10 space-y-1">
 <Link
 href="/"
 className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors"
 >
 ← На сайт
 </Link>
 <button
 onClick={handleLogout}
 className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
 >
 Выйти
 </button>
 </div>
 </aside>

 {/* Контент */}
 <main className="flex-1 overflow-auto p-8">{children}</main>
 </div>
 );
}