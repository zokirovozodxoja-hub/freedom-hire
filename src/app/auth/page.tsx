"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function AuthInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const role = (sp.get("role") as "candidate" | "employer" | null) ?? "candidate";

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function afterAuthRedirect() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    // если подтверждение почты включено — может не быть user сразу
    if (!user) {
      setMsg("Проверь почту и подтверди email, затем войди.");
      return;
    }

    const meta = (user.user_metadata as any) || {};
    const metaRole = meta.role === "employer" ? "employer" : "candidate";

    if (metaRole === "employer") {
      router.push("/employer");
      return;
    }

    // кандидат
    router.push("/onboarding/candidate");
  }

  async function submit() {
    setMsg(null);
    setLoading(true);

    try {
      if (!email.trim()) throw new Error("Введите email");
      if (!password.trim() || password.length < 6) throw new Error("Пароль минимум 6 символов");

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, is_onboarded: false } },
        });
        if (error) throw error;

        await afterAuthRedirect();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        await afterAuthRedirect();
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">{mode === "login" ? "Вход" : "Регистрация"}</div>
            <div className="text-white/60 text-sm mt-1">Роль: {role}</div>
          </div>

          <button
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm"
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            disabled={loading}
          >
            {mode === "login" ? "Создать аккаунт" : "Уже есть аккаунт"}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-xs text-white/60 mb-2">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="text-xs text-white/60 mb-2">Пароль</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="••••••••"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {msg ? <div className="text-sm text-white/80">{msg}</div> : null}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-2xl bg-white text-black px-5 py-3 font-semibold disabled:opacity-60"
          >
            {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full rounded-2xl bg-white/10 border border-white/10 px-5 py-3"
            disabled={loading}
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
          Загрузка...
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}