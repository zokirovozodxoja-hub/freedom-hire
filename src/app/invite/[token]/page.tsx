"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InviteState =
  | { status: "loading" }
  | { status: "invalid"; reason: string }
  | { status: "ready"; invitation: Invitation; needsAuth: boolean }
  | { status: "accepting" }
  | { status: "done"; companyName: string };

type Invitation = {
  id: string;
  company_id: string;
  email: string;
  name: string | null;
  role: string;
  expires_at: string;
  company: { name: string | null } | null;
};

const ROLE_LABELS: Record<string, string> = {
  admin:          "Администратор",
  recruiter:      "Рекрутер",
  hiring_manager: "Hiring Manager",
  observer:       "Наблюдатель",
};

const ROLE_META: Record<string, { color: string; bg: string; border: string }> = {
  admin:          { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)"  },
  recruiter:      { color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.25)"  },
  hiring_manager: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
  observer:       { color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? ROLE_META.observer;
  return (
    <span
      className="text-sm font-semibold px-3 py-1 rounded-full"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }}
        />
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Проверяем приглашение...</div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  const router  = useRouter();
  const params  = useParams();
  const token   = params?.token as string;
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<InviteState>({ status: "loading" });

  // ─── Load invitation ──────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", reason: "Ссылка недействительна" });
      return;
    }
    void checkInvite();
  }, [token]);

  async function checkInvite() {
    setState({ status: "loading" });

    // 1. Найти приглашение по токену
    const { data: inv, error } = await supabase
      .from("company_invitations")
      .select("id, company_id, email, name, role, expires_at, status, company:companies(name)")
      .eq("token", token)
      .maybeSingle();

    if (error || !inv) {
      setState({ status: "invalid", reason: "Приглашение не найдено или ссылка устарела" });
      return;
    }

    if (inv.status === "accepted") {
      setState({ status: "invalid", reason: "Это приглашение уже было принято" });
      return;
    }

    if (inv.status === "revoked") {
      setState({ status: "invalid", reason: "Это приглашение было отозвано" });
      return;
    }

    if (inv.status === "expired" || new Date(inv.expires_at) < new Date()) {
      setState({ status: "invalid", reason: "Срок действия приглашения истёк. Попросите отправить новое." });
      return;
    }

    // 2. Проверить, залогинен ли пользователь
    const { data: userData } = await supabase.auth.getUser();
    const currentEmail = userData.user?.email ?? null;

    // Если залогинен с другим email — предупредить
    if (currentEmail && currentEmail !== inv.email) {
      setState({
        status: "invalid",
        reason: `Вы вошли как ${currentEmail}, но приглашение отправлено на ${inv.email}. Выйдите и войдите с нужного аккаунта.`,
      });
      return;
    }

    setState({
      status: "ready",
      invitation: inv as unknown as Invitation,
      needsAuth: !currentEmail,
    });
  }

  // ─── Accept ───────────────────────────────────────────────────

  async function handleAccept() {
    if (state.status !== "ready") return;
    const { invitation } = state;

    setState({ status: "accepting" });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        // Должны быть залогинены к этому моменту
        router.replace(`/auth?next=/invite/${token}&mode=login`);
        return;
      }

      // Проверяем, не является ли пользователь уже членом компании
      const { data: existing } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", invitation.company_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (existing) {
        // Уже член — просто помечаем приглашение как принятое и редиректим
        await supabase
          .from("company_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);

        setState({ status: "done", companyName: invitation.company?.name ?? "компании" });
        return;
      }

      // Найти invited_by member id (нужен для company_members.invited_by)
      const { data: invRecord } = await supabase
        .from("company_invitations")
        .select("invited_by")
        .eq("id", invitation.id)
        .single();

      // Создаём company_member
      const { error: memberErr } = await supabase
        .from("company_members")
        .insert({
          company_id: invitation.company_id,
          user_id: userData.user.id,
          role: invitation.role,
          status: "active",
          invited_by: invRecord?.invited_by ?? null,
          joined_at: new Date().toISOString(),
        });

      if (memberErr) throw new Error("Не удалось добавить в команду");

      // Помечаем приглашение как принятое
      await supabase
        .from("company_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      // Обновляем профиль: роль → employer (если была candidate)
      await supabase
        .from("profiles")
        .update({ role: "employer", is_onboarded: true })
        .eq("id", userData.user.id);

      setState({ status: "done", companyName: invitation.company?.name ?? "компании" });

    } catch (e: unknown) {
      setState({
        status: "invalid",
        reason: e instanceof Error ? e.message : "Что-то пошло не так. Попробуйте ещё раз.",
      });
    }
  }

  // ─── After done — redirect ────────────────────────────────────

  useEffect(() => {
    if (state.status === "done") {
      const t = setTimeout(() => router.replace("/employer"), 2500);
      return () => clearTimeout(t);
    }
  }, [state.status]);

  // ─── Render ───────────────────────────────────────────────────

  if (state.status === "loading" || state.status === "accepting") return <Spinner />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--ink)" }}>

      {/* Bg glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(92,46,204,0.2) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-lg font-black tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--lavender)" }}
          >
            FreedomHire
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(196,173,255,0.12)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}
        >

          {/* ── Invalid ── */}
          {state.status === "invalid" && (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <svg width="24" height="24" fill="none" stroke="#f87171" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Приглашение недействительно</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>{state.reason}</p>
              <a
                href="/"
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: "rgba(92,46,204,0.3)", border: "1px solid rgba(92,46,204,0.4)" }}
              >
                На главную
              </a>
            </div>
          )}

          {/* ── Done ── */}
          {state.status === "done" && (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                <svg width="24" height="24" fill="none" stroke="#34d399" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Добро пожаловать!</h2>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                Вы присоединились к команде
              </p>
              <p className="text-base font-semibold" style={{ color: "var(--lavender)" }}>
                {state.companyName}
              </p>
              <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                Перенаправляем в кабинет...
              </p>
            </div>
          )}

          {/* ── Ready ── */}
          {state.status === "ready" && (
            <>
              {/* Header */}
              <div className="text-center mb-7">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.3)" }}
                >
                  <svg width="24" height="24" fill="none" stroke="var(--lavender)" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Приглашение в команду</h2>
              </div>

              {/* Invite info */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    {state.invitation.company?.name ?? "Компания"}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Email</span>
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {state.invitation.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Роль</span>
                    <RoleBadge role={state.invitation.role} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Действует до</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {new Date(state.invitation.expires_at).toLocaleDateString("ru-RU", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Needs auth */}
              {state.needsAuth ? (
                <div>
                  <div
                    className="rounded-xl p-4 mb-5 text-sm"
                    style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}
                  >
                    Войдите в аккаунт <strong>{state.invitation.email}</strong>, чтобы принять приглашение
                  </div>
                  <a
                    href={`/auth?next=/invite/${token}&mode=login`}
                    className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-white transition"
                    style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
                  >
                    Войти и принять
                  </a>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-center mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {state.invitation.name
                      ? `${state.invitation.name}, вас`
                      : "Вас"} приглашают присоединиться к команде работодателя на FreedomHire
                  </p>
                  <button
                    onClick={handleAccept}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition"
                    style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
                  >
                    Принять приглашение
                  </button>
                  <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Нажимая кнопку, вы соглашаетесь с условиями использования
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}