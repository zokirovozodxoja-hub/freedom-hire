"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "candidate" | "employer";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role>("candidate");
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qRole = getQueryParam("role");
    if (qRole === "candidate" || qRole === "employer") setRole(qRole);

    const qNext = getQueryParam("next");
    if (qNext && qNext.startsWith("/")) setNextUrl(qNext);
  }, []);

  async function handleRegister() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (!email.trim()) throw new Error("Введите email.");
      if (!password.trim() || password.trim().length < 6)
        throw new Error("Пароль минимум 6 символов.");

      // 1) создаём auth пользователя
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      // 2) если включено подтверждение email — сессии может не быть
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setNotice("Проверьте почту и подтвердите email, затем войдите.");
        return;
      }

      // 3) записываем роль в profiles (источник правды)
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        role,
        is_onboarded: false,
      });
      if (upsertError) throw upsertError;

      // 4) сразу на нужный онбординг
      router.replace(nextUrl || (role === "employer" ? "/onboarding/employer" : "/onboarding/candidate"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center p-6">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-black">
          Регистрация {role === "employer" ? "работодателя" : "соискателя"}
        </h1>

        <p className="mt-2 text-sm text-white/60">
          {role === "employer"
            ? "После регистрации потребуется подтвердить компанию документами."
            : "Создайте аккаунт и заполните профиль, чтобы откликаться на вакансии."}
        </p>

        <label className="mt-5 block text-sm text-white/70">Email</label>
        <input
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />

        <label className="mt-4 block text-sm text-white/70">Пароль (придумайте)</label>
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        <button
          className="mt-5 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-60"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Подождите..." : "Создать аккаунт"}
        </button>

        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        {notice && <p className="mt-3 text-emerald-300 text-sm">{notice}</p>}

        <p className="mt-4 text-sm text-white/60">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="underline underline-offset-4">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}