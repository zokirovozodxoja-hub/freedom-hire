"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Role = "candidate" | "employer";
type Mode = "signup" | "login";

export default function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("candidate");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const qRole = sp.get("role");
    if (qRole === "employer" || qRole === "candidate") setRole(qRole);
  }, [sp]);

  async function goAfterAuth() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setInfo("Проверьте почту и подтвердите email, затем войдите.");
      return;
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metaRole: Role = meta.role === "employer" ? "employer" : "candidate";

    if (metaRole === "employer") {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      router.replace(company?.id ? "/employer" : "/onboarding/employer");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded")
      .eq("id", user.id)
      .maybeSingle();

    router.replace(profile?.is_onboarded ? "/resume" : "/onboarding/candidate");
  }

  async function submit() {
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (!email.trim()) throw new Error("Введите email.");
      if (!password.trim() || password.trim().length < 6) {
        throw new Error("Пароль минимум 6 символов.");
      }

      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, onboarding_done: false } },
        });
        if (signUpErr) throw signUpErr;

        const { data: u } = await supabase.auth.getUser();
        const user = u.user;

        if (user) {
          await supabase.from("profiles").upsert(
            { id: user.id, role, is_onboarded: false },
            { onConflict: "id" }
          );
        }

        await goAfterAuth();
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) throw signInErr;

      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      if (user && meta.role !== "candidate" && meta.role !== "employer") {
        await supabase.auth.updateUser({ data: { role } });
      }

      await goAfterAuth();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 800px at 50% -10%, #1f2a44 0%, #0b1220 55%, #0b1220 100%)",
      display: "grid",
      placeItems: "center",
      padding: 18,
      color: "white",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
    },
    shell: {
      width: "100%",
      maxWidth: 720,
      borderRadius: 28,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.06)",
      boxShadow: "0 24px 90px rgba(0,0,0,.45)",
      backdropFilter: "blur(18px)",
      overflow: "hidden",
      padding: 22,
    },
    title: { margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: "-0.02em" },
    sub: { marginTop: 6, opacity: 0.75, fontSize: 13, lineHeight: 1.5 },
    row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
    label: { marginTop: 14, fontSize: 12, opacity: 0.75 },
    input: {
      width: "100%",
      marginTop: 8,
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      color: "white",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    },
    btn: {
      width: "100%",
      marginTop: 16,
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.18)",
      background: "white",
      color: "#0b1220",
      fontWeight: 950,
      cursor: "pointer",
    },
    ghost: {
      width: "100%",
      marginTop: 10,
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "transparent",
      color: "rgba(255,255,255,.92)",
      fontWeight: 900,
      cursor: "pointer",
    },
    msg: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontSize: 13,
      lineHeight: 1.4,
      opacity: 0.9,
    },
    err: {
      border: "1px solid rgba(255,99,99,.25)",
      background: "rgba(255,99,99,.10)",
    },
  };

  function pill(active: boolean): React.CSSProperties {
    return {
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.14)",
      background: active ? "white" : "rgba(255,255,255,.06)",
      color: active ? "#0b1220" : "rgba(255,255,255,.92)",
      fontWeight: 900,
      cursor: "pointer",
      minWidth: 160,
      opacity: loading ? 0.8 : 1,
    };
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <h1 style={styles.title}>{mode === "login" ? "Вход" : "Регистрация"}</h1>
        <div style={styles.sub}>
          Роль: <b>{role}</b>
        </div>

        <div style={styles.row}>
          <button type="button" style={pill(mode === "login")} onClick={() => setMode("login")} disabled={loading}>
            Войти
          </button>
          <button type="button" style={pill(mode === "signup")} onClick={() => setMode("signup")} disabled={loading}>
            Создать аккаунт
          </button>
        </div>

        <div style={styles.row}>
          <button type="button" style={pill(role === "candidate")} onClick={() => setRole("candidate")} disabled={loading}>
            Я соискатель
          </button>
          <button type="button" style={pill(role === "employer")} onClick={() => setRole("employer")} disabled={loading}>
            Я работодатель
          </button>
        </div>

        <div style={styles.label}>Email</div>
        <input
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div style={styles.label}>Пароль</div>
        <input
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        <button type="button" style={{ ...styles.btn, opacity: loading ? 0.75 : 1 }} onClick={submit} disabled={loading}>
          {loading ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        <button type="button" style={styles.ghost} onClick={() => router.push("/")} disabled={loading}>
          На главную
        </button>

        {error ? <div style={{ ...styles.msg, ...styles.err }}>{error}</div> : null}
        {info ? <div style={styles.msg}>{info}</div> : null}
      </div>
    </main>
  );
}