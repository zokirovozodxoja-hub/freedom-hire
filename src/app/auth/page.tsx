"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Role = "candidate" | "employer";
type Mode = "signup" | "login";

export default function AuthPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialRole = (sp.get("role") as Role) || "candidate";
  const [role, setRole] = useState<Role>(initialRole);

  const [mode, setMode] = useState<Mode>("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // если пользователь уже залогинен — сразу маршрутизируем
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      await ensureProfileAndRoute(user.id, role);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // если в URL меняют role — подхватываем
    const r = (sp.get("role") as Role) || "candidate";
    setRole(r);
  }, [sp]);

  const title = useMemo(() => (mode === "signup" ? "Регистрация" : "Вход"), [mode]);

  async function ensureProfileAndRoute(userId: string, desiredRole: Role) {
    setMsg(null);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    // Если роль не совпадает — показываем сообщение и НЕ редиректим
    if (profile.role !== desiredRole) {
      setMsg(
        `У вас уже есть профиль роли "${profile.role}". Нажмите "Сменить роль", чтобы продолжить как "${desiredRole}".`
      );
      return;
    }

    // Роутинг по роли
    if (desiredRole === "candidate") {
      router.replace("/resume");
      return;
    }

    // employer: если компании нет — в онбординг работодателя, иначе в кабинет работодателя
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (cErr) {
      setMsg(cErr.message);
      return;
    }

    if (!company) router.replace("/onboarding/employer");
    else router.replace("/employer");
  }

  async function switchRole() {
    setBusy(true);
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setMsg("Сначала войдите в аккаунт.");
      setBusy(false);
      return;
    }

    // обновляем роль в profiles (RLS должен разрешать update own)
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    // дальше — обычный роутинг
    await ensureProfileAndRoute(user.id, role);
    setBusy(false);
  }

  async function onSubmit() {
    setBusy(true);
    setMsg(null);

    try {
      if (!email.trim() || !password) {
        setMsg("Введите email и пароль.");
        setBusy(false);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setMsg(error.message);
          setBusy(false);
          return;
        }

        // Если включено подтверждение email — session может быть null
        if (!data.session) {
          setMsg("Проверьте почту: подтвердите email, затем выполните вход.");
          setMode("login");
          setBusy(false);
          return;
        }

        await ensureProfileAndRoute(data.user!.id, role);
        setBusy(false);
        return;
      }

      // login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }

      await ensureProfileAndRoute(data.user.id, role);
      setBusy(false);
    } catch (e: any) {
      setMsg(e?.message || "Ошибка");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <div className="text-white/70 mt-1">
              Роль: <b>{role === "candidate" ? "Соискатель" : "Работодатель"}</b>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("signup")}
              className={`rounded-2xl px-4 py-2 border ${
                mode === "signup"
                  ? "bg-white text-black border-white"
                  : "bg-white/10 border-white/10"
              }`}
            >
              Регистрация
            </button>
            <button
              onClick={() => setMode("login")}
              className={`rounded-2xl px-4 py-2 border ${
                mode === "login"
                  ? "bg-white text-black border-white"
                  : "bg-white/10 border-white/10"
              }`}
            >
              Вход
            </button>
          </div>
        </div>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/80">
            {msg}
          </div>
        ) : null}

        <div className="mt-6">
          <div className="text-sm text-white/70 mb-2">Выберите роль</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole("candidate")}
              className={`rounded-2xl px-4 py-3 border font-semibold ${
                role === "candidate"
                  ? "bg-white text-black border-white"
                  : "bg-white/10 border-white/10"
              }`}
            >
              Я ищу работу
            </button>
            <button
              onClick={() => setRole("employer")}
              className={`rounded-2xl px-4 py-3 border font-semibold ${
                role === "employer"
                  ? "bg-white text-black border-white"
                  : "bg-white/10 border-white/10"
              }`}
            >
              Я работодатель
            </button>
          </div>

          <button
            onClick={switchRole}
            disabled={busy}
            className="mt-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-2 disabled:opacity-60"
          >
            Сменить роль
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <div>
            <label className="text-xs text-white/60">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={busy}
            className="mt-2 rounded-2xl bg-white text-black px-5 py-3 font-semibold disabled:opacity-60"
          >
            {busy ? "Подождите..." : mode === "signup" ? "Создать аккаунт" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}