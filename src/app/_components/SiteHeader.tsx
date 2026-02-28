"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/jobs", label: "Вакансии" },
  { href: "/employers", label: "Работодателям" },
  { href: "/about", label: "О нас" },
];

// Страницы, на которых хедер скрыт полностью
const HIDDEN_PREFIXES = ["/admin", "/onboarding"];

type AuthUser = {
  email: string;
  role: "candidate" | "employer" | "admin" | null;
  fullName: string | null;
} | null;

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser>(undefined as any);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setAuthUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      setAuthUser({
        email: data.user.email ?? "",
        role: (profile?.role as AuthUser extends null ? never : AuthUser["role"]) ?? null,
        fullName: profile?.full_name ?? null,
      });
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthUser(null);
    router.replace("/");
  }

  function getDashboardLink() {
    if (!authUser) return "/auth";
    if (authUser.role === "admin") return "/admin";
    if (authUser.role === "employer") return "/employer";
    return "/resume";
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  if (isHidden) return null;

  const displayName = authUser?.fullName || authUser?.email || "";
  const initials = displayName ? displayName[0].toUpperCase() : "?";

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
              className={
                isActive(item.href)
                  ? "text-white font-medium"
                  : "hover:text-white transition"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {authUser === undefined ? (
            // Загрузка — пустышка чтобы не прыгал хедер
            <div className="h-10 w-24 rounded-2xl bg-white/5 animate-pulse" />
          ) : authUser ? (
            // Авторизован — показываем аватар + меню
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm text-white/80 max-w-[120px] truncate">
                  {displayName}
                </span>
                <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 bg-[#0f1929] shadow-xl z-50"
                  onBlur={() => setMenuOpen(false)}
                >
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="text-sm font-semibold truncate">{displayName}</div>
                    <div className="text-xs text-white/50 mt-0.5 truncate">{authUser.email}</div>
                    {authUser.role && (
                      <div className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300">
                        {authUser.role === "admin" ? "Администратор" : authUser.role === "employer" ? "Работодатель" : "Соискатель"}
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <Link
                      href={getDashboardLink()}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/8 hover:text-white transition"
                    >
                      🏠 Личный кабинет
                    </Link>
                    {authUser.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/8 hover:text-white transition"
                      >
                        ⚙️ Админ-панель
                      </Link>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                    >
                      🚪 Выйти
                    </button>
                  </div>
                </div>
              )}

              {/* Overlay для закрытия меню */}
              {menuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
              )}
            </div>
          ) : (
            // Не авторизован
            <>
              <Link
                href="/auth"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Войти
              </Link>
              <Link
                href="/auth?mode=signup"
                className="rounded-2xl bg-[#7c3aed] px-5 py-2 font-semibold text-white hover:bg-[#6d28d9] transition"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}