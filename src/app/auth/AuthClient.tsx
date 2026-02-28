"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

type Role = "candidate" | "employer";
type Mode = "signup" | "login";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

function AuthClientInner() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("candidate");
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const qRole = getQueryParam("role");
    if (qRole === "candidate" || qRole === "employer") setRole(qRole as Role);
    const qNext = getQueryParam("next");
    if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      if (!email.trim()) throw new Error("Введите email.");
      if (!password.trim() || password.trim().length < 6)
        throw new Error("Пароль минимум 6 символов.");

      if (mode === "signup") {
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, onboarding_done: false } },
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
          return;
        }
        throw new Error("Не удалось получить сессию. Попробуйте снова.");
      }

      const userEmail = data.user.email ?? "";
      const userRole = (data.user.user_metadata?.role as Role | undefined) ?? role;

      // Admin — всегда на /admin
      if (ADMIN_EMAILS.includes(userEmail)) {
        router.replace("/admin");
        return;
      }

      if (mode === "login") {
        if (userRole === "employer") {
          const { data: company } = await supabase
            .from("companies").select("id").eq("owner_id", data.user.id).maybeSingle();
          router.replace(nextUrl || (company ? "/employer" : "/onboarding/employer"));
        } else {
          const { data: profile } = await supabase
            .from("profiles").select("is_onboarded").eq("id", data.user.id).maybeSingle();
          router.replace(nextUrl || (profile?.is_onboarded ? "/resume" : "/onboarding/candidate"));
        }
        return;
      }

      // При регистрации — на онбординг
      router.replace(nextUrl || (userRole === "employer" ? "/onboarding/employer" : "/onboarding/candidate"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  const modeBtn = (active: boolean) =>
    `rounded-xl border px-4 py-2 font-semibold transition-colors ${
      active ? "border-white bg-white text-black" : "border-white/20 bg-white/5 text-white hover:bg-white/10"
    }`;

  const roleBtn = (active: boolean) =>
    `rounded-xl border px-4 py-2 font-semibold transition-colors ${
      active ? "border-violet-400 bg-violet-600/30 text-white" : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
    }`;

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-black">
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </h1>

        {/* Переключатель режима */}
        <div className="mt-4 flex gap-2">
          <button className={modeBtn(mode === "login")} onClick={() => setMode("login")} disabled={loading}>
            Войти
          </button>
          <button className={modeBtn(mode === "signup")} onClick={() => setMode("signup")} disabled={loading}>
            Регистрация
          </button>
        </div>

        {/* Выбор роли — только при регистрации */}
        {mode === "signup" && (
          <div className="mt-3 flex gap-2">
            <button className={roleBtn(role === "candidate")} onClick={() => setRole("candidate")} disabled={loading}>
              Я соискатель
            </button>
            <button className={roleBtn(role === "employer")} onClick={() => setRole("employer")} disabled={loading}>
              Я работодатель
            </button>
          </div>
        )}

        <label className="mt-6 block text-sm text-white/70">Email</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
        />

        <label className="mt-4 block text-sm text-white/70">Пароль</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        <button
          className="mt-6 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-60"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-300">{notice}</p>}
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
