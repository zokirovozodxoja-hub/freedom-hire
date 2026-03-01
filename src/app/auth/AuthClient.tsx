"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

type Role = "candidate" | "employer";
type Mode = "login" | "signup";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

function AuthClientInner() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("candidate");
  const [step, setStep] = useState<"role" | "form">("form");
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const qRole = getQueryParam("role");
    if (qRole === "candidate" || qRole === "employer") setRole(qRole as Role);
    const qMode = getQueryParam("mode");
    if (qMode === "signup") {
      setMode("signup");
      setStep("role"); // сначала выбор роли
    }
    const qNext = getQueryParam("next");
    if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
  }, []);

  function handleModeSwitch(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
    setStep(m === "signup" ? "role" : "form");
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      if (!email.trim()) throw new Error("Введите email.");
      if (password.trim().length < 6) throw new Error("Пароль минимум 6 символов.");

      if (mode === "signup") {
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role } },
        });
        if (signupError) throw signupError;
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signinError) throw signinError;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (mode === "signup") {
          setNotice("Проверьте почту и подтвердите email, затем войдите.");
          setMode("login");
          setStep("form");
          return;
        }
        throw new Error("Не удалось получить сессию. Попробуйте снова.");
      }

      const userEmail = data.user.email ?? "";

      if (ADMIN_EMAILS.includes(userEmail)) {
        router.replace("/admin");
        return;
      }

      if (mode === "signup") {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: userEmail,
          role,
          is_onboarded: false,
        }, { onConflict: "id" });
        router.replace(nextUrl || (role === "employer" ? "/onboarding/employer" : "/onboarding/candidate"));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_onboarded")
        .eq("id", data.user.id)
        .maybeSingle();

      const userRole = (profile?.role as Role | null) ?? "candidate";

      if (userRole === "employer") {
        const { data: company } = await supabase
          .from("companies").select("id").eq("owner_id", data.user.id).maybeSingle();
        router.replace(nextUrl || (company ? "/employer" : "/onboarding/employer"));
      } else {
        router.replace(nextUrl || (profile?.is_onboarded ? "/resume" : "/onboarding/candidate"));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">

        {/* Переключатель Войти / Регистрация */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleModeSwitch("login")}
            className={`flex-1 rounded-xl py-2.5 font-semibold text-sm transition-colors ${
              mode === "login"
                ? "bg-white text-black"
                : "border border-white/20 text-white/70 hover:text-white hover:bg-white/8"
            }`}
          >
            Войти
          </button>
          <button
            onClick={() => handleModeSwitch("signup")}
            className={`flex-1 rounded-xl py-2.5 font-semibold text-sm transition-colors ${
              mode === "signup"
                ? "bg-white text-black"
                : "border border-white/20 text-white/70 hover:text-white hover:bg-white/8"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* ШАГ 1: Выбор роли при регистрации */}
        {mode === "signup" && step === "role" && (
          <>
            <h1 className="text-xl font-black mb-2">Кто вы?</h1>
            <p className="text-sm text-white/50 mb-6">Выберите роль — от этого зависит ваш личный кабинет</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRole("candidate"); setStep("form"); }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-6 hover:border-violet-500 hover:bg-violet-500/10 transition group"
              >
                <span className="text-4xl">👤</span>
                <div className="text-center">
                  <div className="font-semibold">Соискатель</div>
                  <div className="text-xs text-white/50 mt-1">Ищу работу</div>
                </div>
              </button>

              <button
                onClick={() => { setRole("employer"); setStep("form"); }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-6 hover:border-violet-500 hover:bg-violet-500/10 transition group"
              >
                <span className="text-4xl">🏢</span>
                <div className="text-center">
                  <div className="font-semibold">Работодатель</div>
                  <div className="text-xs text-white/50 mt-1">Ищу сотрудников</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ШАГ 2: Форма */}
        {(mode === "login" || step === "form") && (
          <>
            {mode === "signup" && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-2xl">{role === "employer" ? "🏢" : "👤"}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{role === "employer" ? "Работодатель" : "Соискатель"}</div>
                </div>
                <button
                  onClick={() => setStep("role")}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Изменить
                </button>
              </div>
            )}

            <h1 className="text-xl font-black mb-5">
              {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
            </h1>

            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />

            <label className="block text-sm text-white/70 mt-4 mb-1">Пароль</label>
            <input
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            <button
              className="mt-5 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-60"
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>

            {error && (
              <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
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
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    }>
      <AuthClientInner />
    </Suspense>
  );
}
