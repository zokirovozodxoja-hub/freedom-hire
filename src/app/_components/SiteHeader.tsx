"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n, type Lang } from "@/i18n/context";
import { getUnreadCount } from "@/lib/chat";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];
const HIDDEN_PREFIXES = ["/admin", "/onboarding"];

type AuthUser = {
  email: string;
  role: "candidate" | "employer" | "admin";
  fullName: string | null;
};

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const supabaseRef = useRef(createClient());
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);

  const navItems = [
    { href: "/jobs", label: t.nav.jobs },
    { href: "/employers", label: t.nav.employers },
    { href: "/about", label: t.nav.about },
  ];

  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  // Block body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setAuthUser(null); return; }

      const email = data.user.email ?? "";
      if (ADMIN_EMAILS.includes(email)) {
        setAuthUser({ email, role: "admin", fullName: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = (profile?.role as "candidate" | "employer" | null) ?? "candidate";
      setAuthUser({ email, role, fullName: profile?.full_name ?? null });
    }

    loadUser();
    getUnreadCount().then(setUnreadChats);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setAuthUser(null);
      else loadUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    await supabaseRef.current.auth.signOut();
    setAuthUser(null);
    router.replace("/");
    router.refresh();
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
    <header className="sticky top-0 z-[100] backdrop-blur" style={{ background: "rgba(7,6,15,0.85)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shrink-0"
            style={{ background: "linear-gradient(145deg, #1A0044, #4A1FCC, #7C3AED)", boxShadow: "0 4px 16px rgba(92,46,204,0.5)" }}
          >
            <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "16px", color: "#fff", letterSpacing: "-1px" }}>FH</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-display font-bold" style={{ fontSize: "15px", letterSpacing: "-0.3px", color: "#F6F2FF" }}>
              Freedom<span className="font-accent text-xs ml-0.5" style={{ color: "#C4ADFF", letterSpacing: "0.15em", verticalAlign: "baseline" }}>HIRE</span>
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>freedomhire.uz</div>
          </div>
        </Link>

        {/* DESKTOP NAV - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ 
                color: isActive(item.href) ? "#F6F2FF" : "rgba(255,255,255,0.5)", 
                fontWeight: isActive(item.href) ? 500 : 400, 
                transition: "color .2s" 
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          {/* MOBILE BURGER */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>

          {/* DESKTOP BUTTONS - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {authUser && (
              <Link href="/chat" className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </Link>
            )}
            
            {!authUser && (
              <>
                <Link href="/auth" className="rounded-2xl px-5 py-2 text-sm font-semibold" style={{ border: "1px solid rgba(196,173,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)" }}>
                  {t.nav.login}
                </Link>
                <Link href="/auth?mode=signup" className="rounded-2xl px-5 py-2 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  {t.nav.register}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/70 z-[90] md:hidden" onClick={() => setMobileMenuOpen(false)} />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#16162a] z-[95] md:hidden overflow-y-auto" style={{ borderLeft: "1px solid rgba(196,173,255,0.2)" }}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "rgba(196,173,255,0.1)" }}>
              <h2 className="text-lg font-bold text-white">Меню</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium"
                  style={{
                    background: isActive(item.href) ? "rgba(92,46,204,0.3)" : "transparent",
                    color: isActive(item.href) ? "#fff" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Language */}
            <div className="px-4 py-3">
              <div className="text-xs text-white/40 mb-2">Language</div>
              <div className="flex gap-2">
                {(["ru", "uz", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setMobileMenuOpen(false); }}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: lang === l ? "rgba(92,46,204,0.5)" : "rgba(255,255,255,0.05)",
                      color: lang === l ? "#fff" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* User */}
            {authUser ? (
              <div className="p-4 space-y-2 border-t" style={{ borderColor: "rgba(196,173,255,0.1)" }}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                    <div className="text-xs text-white/40 truncate">{authUser.email}</div>
                  </div>
                </div>
                
                <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl text-base text-white/70">
                  {authUser.role === "admin" ? t.nav.adminPanel : t.nav.dashboard}
                </Link>
                
                <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl text-base text-white/70">
                  Чат {unreadChats > 0 && `(${unreadChats})`}
                </Link>
                
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-base text-red-400">
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-2 border-t" style={{ borderColor: "rgba(196,173,255,0.1)" }}>
                <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="block text-center px-5 py-3 rounded-xl text-base font-semibold bg-white/5 text-white/80">
                  {t.nav.login}
                </Link>
                <Link href="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)} className="block text-center px-5 py-3 rounded-xl text-base font-semibold text-white" style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}