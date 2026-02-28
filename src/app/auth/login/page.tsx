"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nextUrl, setNextUrl] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qNext = getQueryParam("next");
    if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Не удалось получить пользователя. Попробуйте снова.");

      // ✅ Роль берём из profiles (надёжно)
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role,is_onboarded")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profErr) {
        // если таблица/поле недоступны — хотя бы не кидаем в кандидата по умолчанию
        router.replace(nextUrl || "/onboarding");
        return;
      }

      const role = (profile?.role as "candidate" | "employer" | null) ?? null;

      if (role === "employer") {
        router.replace(nextUrl || "/employer");
        return;
      }

      if (role === "candidate") {
        router.replace(nextUrl || (profile?.is_onboarded ? "/resume" : "/onboarding/candidate"));
        return;
      }

      // роли нет → общий онбординг
      router.replace(nextUrl || "/onboarding");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center p-6">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-black">Вход</h1>

        <label className="mt-5 block text-sm text-white/70">Email</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />

        <label className="mt-4 block text-sm text-white/70">Пароль</label>
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <button
          className="mt-5 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-60"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Подождите..." : "Войти"}
        </button>

        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        {notice && <p className="mt-3 text-emerald-300 text-sm">{notice}</p>}

        <p className="mt-4 text-sm text-white/60">
          Нет аккаунта?{" "}
          <Link href="/auth/register" className="underline underline-offset-4">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}