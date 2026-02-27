"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "candidate" | "employer";
type Mode = "signup" | "login";

export default function RegisterPage() {
  const router = useRouter();

  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signup");
  const [role, setRole] = useState<Role>("candidate");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const styles = {
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
    } as React.CSSProperties,

    shell: {
      width: "100%",
      maxWidth: 980,
      borderRadius: 28,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.06)",
      boxShadow: "0 24px 90px rgba(0,0,0,.45)",
      backdropFilter: "blur(18px)",
      overflow: "hidden",
    } as React.CSSProperties,

    header: {
      padding: "22px 22px 16px",
      borderBottom: "1px solid rgba(255,255,255,.10)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    } as React.CSSProperties,

    brand: { margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em" } as React.CSSProperties,
    tagline: { margin: "6px 0 0", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.45 } as React.CSSProperties,

    steps: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.08)",
      fontSize: 12,
      color: "rgba(255,255,255,.86)",
      whiteSpace: "nowrap",
      fontWeight: 800,
    } as React.CSSProperties,

    content: {
      padding: 22,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      gap: 18,
      alignItems: "stretch",
    } as React.CSSProperties,

    card: {
      borderRadius: 22,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.04)",
      padding: 18,
      minWidth: 0,
    } as React.CSSProperties,

    title: { margin: 0, fontSize: 18, fontWeight: 900 } as React.CSSProperties,
    text: { margin: "8px 0 0", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.5 } as React.CSSProperties,

    toggleRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 } as React.CSSProperties,

    toggle: (active: boolean): React.CSSProperties => ({
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.14)",
      background: active ? "white" : "rgba(255,255,255,.06)",
      color: active ? "#0b1220" : "rgba(255,255,255,.92)",
      fontWeight: 900,
      cursor: "pointer",
      minWidth: 160,
    }),

    field: { display: "grid", gap: 6, marginTop: 14 } as React.CSSProperties,
    label: { fontSize: 12, color: "rgba(255,255,255,.72)" } as React.CSSProperties,

    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      color: "white",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    } as React.CSSProperties,

    actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 } as React.CSSProperties,

    primary: {
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.18)",
      background: "white",
      color: "#0b1220",
      fontWeight: 950,
      cursor: "pointer",
      minWidth: 200,
      opacity: loading ? 0.75 : 1,
    } as React.CSSProperties,

    ghost: {
      padding: "12px 14px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "transparent",
      color: "rgba(255,255,255,.92)",
      fontWeight: 900,
      cursor: "pointer",
      minWidth: 160,
    } as React.CSSProperties,

    msgErr: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 16,
      border: "1px solid rgba(255,99,99,.25)",
      background: "rgba(255,99,99,.10)",
      color: "rgba(255,210,210,.95)",
      fontSize: 13,
      lineHeight: 1.4,
    } as React.CSSProperties,

    msgInfo: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 16,
      border: "1px solid rgba(96,165,250,.25)",
      background: "rgba(96,165,250,.10)",
      color: "rgba(210,235,255,.95)",
      fontSize: 13,
      lineHeight: 1.4,
    } as React.CSSProperties,

    list: { margin: "12px 0 0", paddingLeft: 18, color: "rgba(255,255,255,.80)", fontSize: 13, lineHeight: 1.6 } as React.CSSProperties,
    note: { marginTop: 12, fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.4 } as React.CSSProperties,
  } as const;

  const goAfterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setInfo("Аккаунт создан. Проверьте почту для подтверждения, затем войдите.");
      return;
    }

    const meta = (user.user_metadata as any) || {};
    const metaRole: Role = meta.role === "employer" ? "employer" : "candidate";
    const done = meta.onboarding_done === true;

    if (metaRole === "employer") {
      setInfo("Онбординг работодателя сделаем следующим. Сейчас доступен путь соискателя.");
      router.push("/onboarding/candidate");
      return;
    }

    if (done) router.push("/me");
    else router.push("/onboarding/candidate");
  };

  const submit = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (!email.trim()) throw new Error("Введите email.");
      if (!password.trim()) throw new Error("Введите пароль (минимум 6 символов).");

      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { role, onboarding_done: false },
          },
        });
        if (signUpErr) throw signUpErr;

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;

        if (user) {
          await supabase.from("profiles").upsert({ id: user.id, role }, { onConflict: "id" });
        }

        await goAfterAuth();
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) throw signInErr;

      await goAfterAuth();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <style>{`
        @media (max-width: 900px) {
          .fh-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.brand}>Freedom Hire</h1>
            <p style={styles.tagline}>
              Выберите роль, создайте аккаунт и пройдите онбординг. Вакансии покажем после завершения профиля.
            </p>
          </div>
          <div style={styles.steps}>{mode === "signup" ? "Регистрация" : "Вход"}</div>
        </div>

        <div className="fh-cols" style={styles.content}>
          <div style={styles.card}>
            <h2 style={styles.title}>{mode === "signup" ? "Создать аккаунт" : "Войти"}</h2>
            <p style={styles.text}>Пока оставляем только Email + пароль (без телефона).</p>

            <div style={styles.toggleRow}>
              <button
                type="button"
                style={styles.toggle(mode === "signup")}
                onClick={() => setMode("signup")}
                disabled={loading}
              >
                Регистрация
              </button>
              <button
                type="button"
                style={styles.toggle(mode === "login")}
                onClick={() => setMode("login")}
                disabled={loading}
              >
                Уже есть аккаунт
              </button>
            </div>

            <div style={styles.toggleRow}>
              <button
                type="button"
                style={styles.toggle(role === "candidate")}
                onClick={() => setRole("candidate")}
                disabled={loading}
              >
                Я ищу работу
              </button>
              <button
                type="button"
                style={styles.toggle(role === "employer")}
                onClick={() => setRole("employer")}
                disabled={loading}
              >
                Я работодатель
              </button>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Email</div>
              <input
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Пароль</div>
              <input
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && <div style={styles.msgErr}>{error}</div>}
            {info && <div style={styles.msgInfo}>{info}</div>}

            <div style={styles.actions}>
              <button type="button" style={styles.primary} onClick={submit} disabled={loading}>
                {loading ? "Подождите…" : mode === "signup" ? "Создать аккаунт" : "Войти"}
              </button>

              <button type="button" style={styles.ghost} onClick={() => router.push("/")} disabled={loading}>
                На главную
              </button>
            </div>

            <div style={styles.note}>
              Если подтверждение почты включено в Supabase — после регистрации сначала подтвердите email, затем войдите.
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.title}>Что будет дальше</h2>
            <p style={styles.text}>Коротко и понятно — чтобы человек не терялся после входа.</p>

            <ul style={styles.list}>
              <li>
                <b>Соискатель</b>: регистрация → заполнить профиль → загрузить портфолио → смотреть вакансии.
              </li>
              <li>
                <b>Работодатель</b>: регистрация → компания → документы → первая вакансия (сделаем следующим этапом).
              </li>
              <li>Вакансии не показываем, пока профиль не заполнен.</li>
            </ul>

            <div style={styles.note}>
              Сейчас твой редирект на <b>/jobs</b> исчезнет, потому что этот файл ведёт на <b>/onboarding/candidate</b> или <b>/me</b>.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
