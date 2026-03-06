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

 const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
 if (!session) setAuthUser(null);
 else loadUser();
 });

 return () => listener.subscription.unsubscribe();
 }, []);

 async function handleLogout() {
 setMenuOpen(false);
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

 return (
 <header
 className="sticky top-0 z-50 border-b border-white/10 backdrop-blur"
 style={{ background: "rgba(7,6,15,0.85)" }}
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
 <div className="leading-tight">
 <div className="font-display font-bold text-white" style={{ fontSize: "15px", letterSpacing: "-0.3px" }}>
 Freedom<span className="font-accent text-xs ml-0.5" style={{ color: "var(--lavender)", letterSpacing: "0.15em", verticalAlign: "baseline" }}>HIRE</span>
 </div>
 <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>freedomhire.uz</div>
 </div>
 </Link>

 {/* NAV */}
 <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
 {navItems.map((item) => (
 <Link
 key={item.href}
 href={item.href}
 className={`transition ${isActive(item.href) ? "text-white font-medium" : "hover:text-white"}`}
 >
 {item.label}
 </Link>
 ))}
 </nav>

 {/* RIGHT: LANG SWITCHER + USER */}
 <div className="flex items-center gap-2">

 {/* Language Switcher */}
 <div
 className="flex items-center rounded-xl overflow-hidden shrink-0"
 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
 >
 {(["ru", "uz"] as Lang[]).map((l) => (
 <button
 key={l}
 onClick={() => setLang(l)}
 className="px-3 py-1.5 text-xs font-semibold transition"
 style={{
 background: lang === l ? "rgba(92,46,204,0.5)" : "transparent",
 color: lang === l ? "#fff" : "rgba(255,255,255,0.45)",
 borderRight: l === "ru" ? "1px solid rgba(255,255,255,0.1)" : undefined,
 }}
 >
 {l.toUpperCase()}
 </button>
 ))}
 </div>

 {/* User */}
 {authUser === undefined ? (
 <div className="h-9 w-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
 ) : authUser ? (
 <div className="relative">
 <button
 onClick={() => setMenuOpen((v) => !v)}
 className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/8"
 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
 >
 <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
 authUser.role === "admin" ? "bg-red-600" : "bg-violet-600"
 }`}>
 {initials}
 </div>
 <span className="hidden sm:block text-sm text-white/80 max-w-[120px] truncate">
 {displayName}
 </span>
 <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>

 {menuOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
 <div
 className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden"
 style={{ background: "#0f1929", border: "1px solid rgba(255,255,255,0.1)" }}
 >
 <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
 <div className="text-sm font-semibold text-white truncate">{displayName}</div>
 <div className="text-xs text-white/40 mt-0.5 truncate">{authUser.email}</div>
 <div className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full ${roleBadge[authUser.role].cls}`}>
 {roleBadge[authUser.role].label}
 </div>
 </div>
 <div className="p-2 space-y-0.5">
 <Link
 href={getDashboardLink()}
 onClick={() => setMenuOpen(false)}
 className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
 >
 {authUser.role === "admin" ? ` ${t.nav.adminPanel}` : ` ${t.nav.dashboard}`}
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
 className="rounded-2xl px-5 py-2 text-sm font-semibold text-white/80 transition hover:text-white"
 style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
 >
 {t.nav.login}
 </Link>
 <Link
 href="/auth?mode=signup"
 className="rounded-2xl px-5 py-2 text-sm font-semibold text-white transition"
 style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", boxShadow: "0 4px 16px rgba(92,46,204,0.4)" }}
 >
 {t.nav.register}
 </Link>
 </>
 )}
 </div>
 </div>
 </header>
 );
}