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

  const roleBadge = {
    admin: { label: t.roles.admin, cls: "bg-red-600/30 text-red-300" },
    employer: { label: t.roles.employer, cls: "bg-blue-600/30 text-blue-300" },
    candidate: { label: t.roles.candidate, cls: "bg-violet-600/30 text-violet-300" },
  };

  const navBg = "var(--nav-bg)";
  const navBorder = "var(--nav-border)";
  const iconBg = "var(--surface)";
  const iconBorder = "var(--border)";
  const userBg = "var(--surface)";
  const userBorder = "var(--border)";
  const userNameColor = "var(--text-secondary)";
  const dropdownBg = "var(--dropdown-bg)";
  const dropdownBorder = "var(--border)";
  const dropdownLinkColor = "var(--text-secondary)";

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur"
      style={{ background: navBg, borderBottom: `1px solid ${navBorder}`, transition: "background .3s, border-color .3s" }}
    >
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
            <div className="font-display font-bold" style={{ fontSize: "15px", letterSpacing: "-0.3px", color: "var(--text-primary)" }}>
              Freedom<span className="font-accent text-xs ml-0.5" style={{ color: "var(--lavender)", letterSpacing: "0.15em", verticalAlign: "baseline" }}>HIRE</span>
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>freedomhire.uz</div>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ color: isActive(item.href) ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isActive(item.href) ? 500 : 400, transition: "color .2s" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">

          {/* Chat icon - Hidden on mobile */}
          {authUser && (
            <Link
              href="/chat"
              className="hidden sm:flex"
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: iconBg, border: `1px solid ${iconBorder}`, textDecoration: "none", flexShrink: 0, transition: "all .2s" }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadChats > 0 && (
                <div style={{ position: "absolute", top: -5, right: -5, background: "var(--brand-core)", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: `2px solid ${navBg}` }}>
                  {unreadChats > 9 ? "9+" : unreadChats}
                </div>
              )}
            </Link>
          )}

          {/* Language Switcher - Hidden on smallest mobile */}
          <div
            className="hidden sm:flex items-center rounded-xl overflow-hidden shrink-0"
            style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
          >
            {(["ru", "uz", "en"] as Lang[]).map((l, idx) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  background: lang === l ? "rgba(92,46,204,0.5)" : "transparent",
                  color: lang === l ? "#fff" : "var(--text-secondary)",
                  borderRight: idx < 2 ? `1px solid ${iconBorder}` : undefined,
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Desktop User Menu */}
          {authUser === undefined ? (
            <div className="hidden md:block h-9 w-24 rounded-2xl animate-pulse" style={{ background: iconBg }} />
          ) : authUser ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-2xl px-3 py-2 transition"
                style={{ background: userBg, border: `1px solid ${userBorder}` }}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  authUser.role === "admin" ? "bg-red-600" : "bg-violet-600"
                }`}>
                  {initials}
                </div>
                <span className="hidden sm:block text-sm max-w-[120px] truncate" style={{ color: userNameColor }}>
                  {displayName}
                </span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: dropdownBg, border: `1px solid ${dropdownBorder}` }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${dropdownBorder}` }}>
                      <div className="text-sm font-semibold truncate" style={{ color: "#fff" }}>{displayName}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{authUser.email}</div>
                      <div className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full ${roleBadge[authUser.role].cls}`}>
                        {roleBadge[authUser.role].label}
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <Link
                        href={getDashboardLink()}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/8"
                        style={{ color: dropdownLinkColor }}
                      >
                        {authUser.role === "admin" ? t.nav.adminPanel : t.nav.dashboard}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        {t.nav.logout}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth"
                className="hidden md:block rounded-2xl px-5 py-2 text-sm font-semibold transition"
                style={{ border: `1px solid ${iconBorder}`, background: iconBg, color: "rgba(255,255,255,0.8)" }}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/auth?mode=signup"
                className="hidden md:block rounded-2xl px-5 py-2 text-sm font-semibold text-white transition"
                style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", boxShadow: "0 4px 16px rgba(92,46,204,0.4)" }}
              >
                {t.nav.register}
              </Link>
            </>
          )}

          {/* MOBILE BURGER MENU BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed top-[73px] right-0 bottom-0 w-[80%] max-w-sm z-50 md:hidden overflow-y-auto"
            style={{ background: dropdownBg, borderLeft: `1px solid ${dropdownBorder}` }}
          >
            <div className="p-4 space-y-4">
              
              {/* Mobile Nav Links */}
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base transition"
                    style={{
                      background: isActive(item.href) ? "rgba(92,46,204,0.2)" : "transparent",
                      color: isActive(item.href) ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: isActive(item.href) ? 600 : 400,
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Mobile Language Switcher */}
              <div className="px-4">
                <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Язык / Language</div>
                <div className="flex gap-2">
                  {(["ru", "uz", "en"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLang(l);
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition"
                      style={{
                        background: lang === l ? "rgba(92,46,204,0.5)" : "rgba(255,255,255,0.05)",
                        color: lang === l ? "#fff" : "var(--text-secondary)",
                        border: `1px solid ${lang === l ? "transparent" : iconBorder}`,
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile User Section */}
              {authUser ? (
                <>
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${dropdownBorder}` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold ${
                        authUser.role === "admin" ? "bg-red-600" : "bg-violet-600"
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: "#fff" }}>{displayName}</div>
                        <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{authUser.email}</div>
                      </div>
                    </div>
                    <div className={`inline-block text-xs px-2 py-0.5 rounded-full ${roleBadge[authUser.role].cls}`}>
                      {roleBadge[authUser.role].label}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href={getDashboardLink()}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-base transition hover:bg-white/8"
                      style={{ color: dropdownLinkColor }}
                    >
                      {authUser.role === "admin" ? t.nav.adminPanel : t.nav.dashboard}
                    </Link>
                    
                    {authUser && (
                      <Link
                        href="/chat"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded-xl text-base transition hover:bg-white/8 relative"
                        style={{ color: dropdownLinkColor }}
                      >
                        Чат
                        {unreadChats > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadChats}
                          </span>
                        )}
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-xl text-base text-red-400 transition hover:bg-red-500/10"
                    >
                      {t.nav.logout}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 px-4">
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center rounded-xl px-5 py-3 text-base font-semibold transition"
                    style={{ border: `1px solid ${iconBorder}`, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" }}
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center rounded-xl px-5 py-3 text-base font-semibold text-white transition"
                    style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", boxShadow: "0 4px 16px rgba(92,46,204,0.4)" }}
                  >
                    {t.nav.register}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}