"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type Role = "candidate" | "employer";
type Mode = "signup" | "login";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

export default function AuthClient() {
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
    if (qRole === "candidate" || qRole === "employer") setRole(qRole);

    const qNext = getQueryParam("next");
    if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
  }, []);


  const getRedirectByRole = (targetRole: Role) =>
    targetRole === "employer" ? "/employer" : "/onboarding/candidate";

  async function submit() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (!email.trim()) throw new Error("Введите email.");
      if (!password.trim() || password.trim().length < 6) throw new Error("Пароль минимум 6 символов.");

      if (mode === "signup") {
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, onboarding_done: false } },
        });
        if (signupError) throw signupError;
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signinError) throw signinError;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (mode === "signup") {
          setNotice("Проверьте почту и подтвердите email, затем войдите в аккаунт.");
          setMode("login");
          return;
        }
        throw new Error("Не удалось получить активную сессию. Попробуйте войти снова.");
      }

      const userRole = (data.user.user_metadata?.role as Role | undefined) ?? role;
      router.replace(nextUrl || getRedirectByRole(userRole));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle = (active: boolean) =>
    `rounded-xl border px-4 py-2 font-semibold ${active ? "border-white bg-white text-black" : "border-white/20 bg-white/5 text-white"}`;

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center p-6">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-black">Авторизация</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={buttonStyle(mode === "login")} onClick={() => setMode("login")} disabled={loading}>Войти</button>
          <button className={buttonStyle(mode === "signup")} onClick={() => setMode("signup")} disabled={loading}>Создать аккаунт</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={buttonStyle(role === "candidate")} onClick={() => setRole("candidate")} disabled={loading}>Я соискатель</button>
          <button className={buttonStyle(role === "employer")} onClick={() => setRole("employer")} disabled={loading}>Я работодатель</button>
        </div>

        <label className="mt-5 block text-sm text-white/70">Email</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="mt-4 block text-sm text-white/70">Пароль</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
        />

        <button
          className="mt-5 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
      </div>
    </main>
  );
}
