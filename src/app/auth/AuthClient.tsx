"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

type Role = "candidate" | "employer";
type Mode = "login" | "signup";
type LoginMethod = "password" | "otp";

function getQueryParam(name: string): string | null {
 if (typeof window === "undefined") return null;
 return new URL(window.location.href).searchParams.get(name);
}

function AuthClientInner() {
 const router = useRouter();
 const [mode, setMode] = useState<Mode>("login");
 const [role, setRole] = useState<Role>("candidate");
 const [step, setStep] = useState<"role" | "form" | "otp">("form");
 const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
 const [nextUrl, setNextUrl] = useState<string | null>(null);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [otpCode, setOtpCode] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [notice, setNotice] = useState<string | null>(null);

 useEffect(() => {
 const qRole = getQueryParam("role");
 if (qRole === "candidate" || qRole === "employer") setRole(qRole as Role);
 const qMode = getQueryParam("mode");
 if (qMode === "signup") { setMode("signup"); setStep("role"); }
 const qNext = getQueryParam("next");
 if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
 // Показываем сообщение о блокировке
 const qError = getQueryParam("error");
 if (qError === "blocked") {
 setError("Ваш аккаунт заблокирован. Обратитесь в поддержку: support@freedomhire.uz");
 }
 }, []);

 function handleModeSwitch(m: Mode) {
 setMode(m);
 setError(null);
 setNotice(null);
 setOtpCode("");
 setStep(m === "signup" ? "role" : "form");
 }

 async function sendOtp() {
 setLoading(true);
 setError(null);
 try {
 if (!email.trim()) throw new Error("Введите email.");
 const supabase = createClient();
 const { error } = await supabase.auth.signInWithOtp({
 email: email.trim(),
 options: {
 shouldCreateUser: mode === "signup",
 data: mode === "signup" ? { role } : undefined,
 },
 });
 if (error) throw error;
 setStep("otp");
 setNotice(`Код отправлен на ${email}`);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : "Ошибка отправки кода");
 } finally {
 setLoading(false);
 }
 }

 async function verifyOtp() {
 setLoading(true);
 setError(null);
 try {
 if (otpCode.length < 6) throw new Error("Введите 6-значный код.");
 const supabase = createClient();
 const { error } = await supabase.auth.verifyOtp({
 email: email.trim(),
 token: otpCode.trim(),
 type: "email",
 });
 if (error) throw error;
 await afterLogin(supabase);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : "Неверный код");
 } finally {
 setLoading(false);
 }
 }

 async function submitPassword() {
 setLoading(true);
 setError(null);
 try {
 const supabase = createClient();
 if (!email.trim()) throw new Error("Введите email.");
 if (password.trim().length < 6) throw new Error("Пароль минимум 6 символов.");

 if (mode === "signup") {
 const { error } = await supabase.auth.signUp({
 email: email.trim(), password,
 options: { data: { role } },
 });
 if (error) throw error;
 } else {
 const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
 if (error) throw error;
 }
 await afterLogin(supabase);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message : "Ошибка авторизации");
 } finally {
 setLoading(false);
 }
 }

 async function afterLogin(supabase: ReturnType<typeof createClient>) {
 const { data } = await supabase.auth.getUser();
 if (!data.user) {
 if (mode === "signup") {
 setNotice("Проверьте почту и подтвердите email, затем войдите.");
 setMode("login"); setStep("form"); return;
 }
 throw new Error("Не удалось получить сессию.");
 }
 const userEmail = data.user.email ?? "";
 if (ADMIN_EMAILS.includes(userEmail)) { router.replace("/admin"); return; }

 if (mode === "signup") {
 await supabase.from("profiles").upsert({
 id: data.user.id, email: userEmail, role, is_onboarded: false,
 }, { onConflict: "id" });
 router.replace(nextUrl || (role === "employer" ? "/onboarding/employer" : "/onboarding/candidate"));
 return;
 }

 const { data: profile } = await supabase
 .from("profiles").select("role, is_onboarded").eq("id", data.user.id).maybeSingle();
 const userRole = (profile?.role as Role | null) ?? "candidate";
 if (userRole === "employer") {
 const { data: company } = await supabase.from("companies").select("id").eq("owner_id", data.user.id).maybeSingle();
 router.replace(nextUrl || (company ? "/employer" : "/onboarding/employer"));
 } else {
 router.replace(nextUrl || (profile?.is_onboarded ? "/resume" : "/onboarding/candidate"));
 }
 }

 // ═══ ШАГ OTP ═══
 if (step === "otp") {
 return (
 <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
 <div className="w-full rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}>
 <button onClick={() => { setStep("form"); setOtpCode(""); setError(null); setNotice(null); }}
 className="text-sm mb-6 flex items-center gap-1" style={{ color: "#C4ADFF" }}>
 ← Назад
 </button>
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.25)" }}>
          <svg className="w-7 h-7" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
 <h1 className="text-xl font-bold text-center mb-2">Проверьте почту</h1>
 <p className="text-sm text-center mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
 Код отправлен на<br />
 <span className="text-white font-medium">{email}</span>
 </p>

 <label className="block text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Код из письма</label>
 <input
 className="w-full rounded-xl px-3 py-3 text-white text-center text-2xl tracking-[0.5em] focus:outline-none transition"
 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(196,173,255,0.2)" }}
 value={otpCode}
 onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
 onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
 placeholder="000000"
 maxLength={6}
 autoFocus
 />

 <button onClick={verifyOtp} disabled={loading || otpCode.length < 6}
 className="mt-4 w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-50"
 style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
 {loading ? "Проверяем..." : "Подтвердить →"}
 </button>

 <button onClick={sendOtp} disabled={loading}
 className="mt-3 w-full text-sm py-2 rounded-xl transition"
 style={{ color: "rgba(255,255,255,0.35)" }}>
 Отправить код повторно
 </button>

 {error && (
 <div className="mt-3 px-4 py-3 rounded-xl text-sm"
 style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
 {error}
 </div>
 )}
 {notice && (
 <div className="mt-3 px-4 py-3 rounded-xl text-sm"
 style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#6ee7b7" }}>
 {notice}
 </div>
 )}
 </div>
 </main>
 );
 }

 // ═══ ОСНОВНАЯ ФОРМА ═══
 return (
 <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
 <div className="w-full rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}>

 {/* Войти / Регистрация */}
 <div className="flex gap-2 mb-6">
 {(["login", "signup"] as Mode[]).map((m) => (
 <button key={m} onClick={() => handleModeSwitch(m)}
 className="flex-1 rounded-xl py-2.5 font-semibold text-sm transition-colors"
 style={{
 background: mode === m ? "#fff" : "rgba(255,255,255,0.05)",
 color: mode === m ? "#000" : "rgba(255,255,255,0.6)",
 border: mode === m ? "none" : "1px solid rgba(255,255,255,0.1)",
 }}>
 {m === "login" ? "Войти" : "Регистрация"}
 </button>
 ))}
 </div>

 {/* Выбор роли при регистрации */}
 {mode === "signup" && step === "role" ? (
 <>
 <h1 className="text-xl font-bold mb-2">Кто вы?</h1>
 <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Выберите роль</p>
 <div className="grid grid-cols-2 gap-3">
 {([
 { value: "candidate" as Role, label: "Соискатель", desc: "Ищу работу" },
 { value: "employer" as Role, label: "Работодатель", desc: "Ищу сотрудников" },
 ]).map((r) => (
 <button key={r.value} onClick={() => { setRole(r.value); setStep("form"); }}
 className="flex flex-col items-center gap-3 rounded-2xl p-6 transition hover:border-violet-500"
 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 {r.value === "candidate" ? (
 <svg className="w-7 h-7" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 ) : (
 <svg className="w-7 h-7" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
 </svg>
 )}
 </div>
 <div className="text-center">
 <div className="font-semibold text-sm">{r.label}</div>
 <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{r.desc}</div>
 </div>
 </button>
 ))}
 </div>
 </>
 ) : (
 <>
 {/* Выбранная роль */}
 {mode === "signup" && (
 <div className="flex items-center gap-3 mb-5 p-3 rounded-xl"
 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(92,46,204,0.2)" }}>
                    {role === "employer" ? (
                      <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
 <div className="flex-1 text-sm font-medium">{role === "employer" ? "Работодатель" : "Соискатель"}</div>
 <button onClick={() => setStep("role")} className="text-xs" style={{ color: "#C4ADFF" }}>Изменить</button>
 </div>
 )}

 <h1 className="text-xl font-bold mb-5">
 {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
 </h1>

 {/* Способ входа (только login) */}
 {mode === "login" && (
 <div className="flex gap-2 mb-5">
 {([
 { value: "password" as LoginMethod, label: "Пароль" },
 { value: "otp" as LoginMethod, label: "Код на email" },
 ]).map((m) => (
 <button key={m.value} onClick={() => { setLoginMethod(m.value); setError(null); }}
 className="flex-1 py-2 rounded-xl text-sm transition"
 style={{
 background: loginMethod === m.value ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.04)",
 border: loginMethod === m.value ? "1px solid rgba(196,173,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
 color: loginMethod === m.value ? "#C4ADFF" : "rgba(255,255,255,0.5)",
 }}>
 {m.label}
 </button>
 ))}
 </div>
 )}

 {/* Email */}
 <label className="block text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Email</label>
 <input
 className="w-full rounded-xl px-3 py-2.5 text-white placeholder-white/25 focus:outline-none transition"
 style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (loginMethod === "otp" && mode === "login" ? sendOtp() : submitPassword())}
 placeholder="you@example.com"
 type="email"
 autoComplete="email"
 />

 {/* Пароль */}
 {(mode === "signup" || loginMethod === "password") && (
 <>
 <label className="block text-sm mt-4 mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Пароль</label>
 <input
 className="w-full rounded-xl px-3 py-2.5 text-white placeholder-white/25 focus:outline-none transition"
 style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && submitPassword()}
 type="password"
 placeholder="••••••••"
 autoComplete={mode === "login" ? "current-password" : "new-password"}
 />
 </>
 )}

 {/* Кнопка */}
 <button
 onClick={loginMethod === "otp" && mode === "login" ? sendOtp : submitPassword}
 disabled={loading}
 className="mt-5 w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-60"
 style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", boxShadow: "0 4px 16px rgba(92,46,204,0.4)" }}>
 {loading ? "Подождите..." :
 loginMethod === "otp" && mode === "login" ? "Получить код →" :
 mode === "login" ? "Войти" : "Создать аккаунт"}
 </button>

 {error && (
 <div className="mt-3 px-4 py-3 rounded-xl text-sm"
 style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
 {error}
 </div>
 )}
 {notice && (
 <div className="mt-3 px-4 py-3 rounded-xl text-sm"
 style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#6ee7b7" }}>
 {notice}
 </div>
 )}
 </>
 )}
 </div>
 </main>
 );
}

export default function AuthClient() {
 return (
 <Suspense fallback={
 <div style={{ minHeight:"100vh", background:"var(--ink)", display:"grid", placeItems:"center" }}><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(196,173,255,0.2)", borderTopColor:"var(--lavender)" }} /></div>
 }>
 <AuthClientInner />
 </Suspense>
 );
}
