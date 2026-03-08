"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────

type CompanyMember = {
  id: string;
  user_id: string;
  role: Role;
  status: "active" | "deactivated";
  joined_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: string;
  expires_at: string;
  created_at: string;
};

type Role = "owner" | "admin" | "recruiter" | "hiring_manager" | "observer";

// ─── Constants ───────────────────────────────────────────────────

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "admin",          label: "Администратор",    desc: "Почти полный доступ, кроме настроек компании" },
  { value: "recruiter",      label: "Рекрутер",         desc: "Вакансии, отклики, чат, интервью" },
  { value: "hiring_manager", label: "Hiring Manager",   desc: "Участие в интервью, просмотр кандидатов" },
  { value: "observer",       label: "Наблюдатель",      desc: "Только приглашённые интервью" },
];

const ROLE_META: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  owner:          { label: "Владелец",       color: "#C4ADFF", bg: "rgba(196,173,255,0.12)", border: "rgba(196,173,255,0.25)" },
  admin:          { label: "Администратор",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)"  },
  recruiter:      { label: "Рекрутер",       color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.25)"  },
  hiring_manager: { label: "Hiring Manager", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
  observer:       { label: "Наблюдатель",    color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" },
};

// ─── Sub-components ───────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role];
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 36 }: { name: string | null; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ""}
        width={size} height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["rgba(92,46,204,0.5)", "rgba(52,211,153,0.4)", "rgba(251,191,36,0.4)", "rgba(96,165,250,0.4)"];
  const bg = colors[(name ?? "").charCodeAt(0) % colors.length];
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }}
        />
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Загрузка...</div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────

function InviteModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  const [role, setRole]     = useState<Role>("recruiter");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) { setError("Введите email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Некорректный email"); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/company/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null, role }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка отправки");

      onSent();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "#1a0f35", border: "1px solid rgba(196,173,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Пригласить сотрудника</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(196,173,255,0.15)",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(196,173,255,0.4)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(196,173,255,0.15)")}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>Имя (необязательно)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Айгуль Рахимова"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(196,173,255,0.15)",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(196,173,255,0.4)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(196,173,255,0.15)")}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>Роль</label>
            <div className="flex flex-col gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition"
                  style={{
                    background: role === r.value ? "rgba(92,46,204,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${role === r.value ? "rgba(196,173,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ borderColor: role === r.value ? "var(--lavender)" : "rgba(255,255,255,0.3)" }}
                  >
                    {role === r.value && <div className="w-2 h-2 rounded-full" style={{ background: "var(--lavender)" }} />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{r.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={saving}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
          >
            {saving ? "Отправляем..." : "Отправить приглашение"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Role Modal ────────────────────────────────────────────

function ChangeRoleModal({
  member,
  onClose,
  onChanged,
}: {
  member: CompanyMember;
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [role, setRole]     = useState<Role>(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const name = member.profiles?.full_name ?? member.profiles?.email ?? "Сотрудник";

  async function handleSave() {
    if (role === member.role) { onClose(); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("company_members")
        .update({ role })
        .eq("id", member.id);
      if (err) throw new Error("Не удалось изменить роль");
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "#1a0f35", border: "1px solid rgba(196,173,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Изменить роль</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition" style={{ color: "rgba(255,255,255,0.4)" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>{name}</div>

        <div className="flex flex-col gap-2 mb-4">
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
              style={{
                background: role === r.value ? "rgba(92,46,204,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${role === r.value ? "rgba(196,173,255,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: role === r.value ? "var(--lavender)" : "rgba(255,255,255,0.3)" }}
              >
                {role === r.value && <div className="w-2 h-2 rounded-full" style={{ background: "var(--lavender)" }} />}
              </div>
              <span className="text-sm font-medium text-white">{r.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl px-3 py-2 text-sm mb-3" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium transition hover:bg-white/10" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function EmployerTeamPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading]       = useState(true);
  const [members, setMembers]       = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myMember, setMyMember]     = useState<CompanyMember | null>(null);

  const [showInvite, setShowInvite]               = useState(false);
  const [changeRoleFor, setChangeRoleFor]         = useState<CompanyMember | null>(null);
  const [deactivating, setDeactivating]           = useState<string | null>(null);
  const [revoking, setRevoking]                   = useState<string | null>(null);
  const [toast, setToast]                         = useState<{ text: string; ok: boolean } | null>(null);

  function showToast(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/auth"); return; }

    // Находим текущего member
    const { data: me, error: meErr } = await supabase
      .from("company_members")
      .select("id, company_id, user_id, role, status, joined_at, created_at")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!me) { router.replace("/onboarding/employer"); return; }

    setMyMember(me as unknown as CompanyMember);

    // Все активные члены компании
    const { data: allMembers } = await supabase
      .from("company_members")
      .select("id, company_id, user_id, role, status, joined_at, created_at")
      .eq("company_id", me.company_id)
      .order("created_at", { ascending: true });

    // Загружаем профили отдельно
    const userIds = (allMembers ?? []).map((m: any) => m.user_id);
    const { data: profilesData } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profilesData ?? []).map((p: any) => [p.id, p]));

    const membersWithProfiles = (allMembers ?? []).map((m: any) => ({
      ...m,
      profiles: profileMap[m.user_id] ?? null,
    }));

    setMembers(membersWithProfiles as unknown as CompanyMember[]);

    // Pending приглашения (только для owner/admin)
    if (["owner", "admin"].includes(me.role)) {
      const { data: invs } = await supabase
        .from("company_invitations")
        .select("id, email, name, role, status, expires_at, created_at")
        .eq("company_id", (me as any).company_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setInvitations((invs ?? []) as Invitation[]);
    }

    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleDeactivate(memberId: string) {
    if (!confirm("Отключить доступ этого сотрудника?")) return;
    setDeactivating(memberId);
    const { error } = await supabase
      .from("company_members")
      .update({ status: "deactivated" })
      .eq("id", memberId);
    if (error) { showToast("Не удалось отключить", false); }
    else { showToast("Доступ отключён"); void load(); }
    setDeactivating(null);
  }

  async function handleRevoke(invId: string) {
    setRevoking(invId);
    const { error } = await supabase
      .from("company_invitations")
      .update({ status: "revoked" })
      .eq("id", invId);
    if (error) { showToast("Не удалось отозвать", false); }
    else { showToast("Приглашение отозвано"); void load(); }
    setRevoking(null);
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  }

  const canManage = myMember && ["owner", "admin"].includes(myMember.role);

  if (loading) return <Spinner />;

  const activeMembers = members.filter(m => m.status === "active");

  return (
    <div className="min-h-screen text-white p-6" style={{ background: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto">

        {/* ── Хлебные крошки ── */}
        <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link href="/employer" className="hover:text-white transition">Кабинет</Link>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Команда</span>
        </div>

        {/* ── Заголовок ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Команда</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {activeMembers.length} {activeMembers.length === 1 ? "сотрудник" : activeMembers.length < 5 ? "сотрудника" : "сотрудников"}
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
              Пригласить
            </button>
          )}
        </div>

        {/* ── Список сотрудников ── */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(196,173,255,0.1)" }}
        >
          {/* Заголовок таблицы */}
          <div
            className="grid px-5 py-3 text-xs font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: "1fr auto auto",
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(196,173,255,0.08)",
            }}
          >
            <span>Сотрудник</span>
            <span className="mr-8">Присоединился</span>
            <span>Действия</span>
          </div>

          {activeMembers.map((member, i) => {
            const name = member.profiles?.full_name ?? member.profiles?.email ?? "Без имени";
            const email = member.profiles?.email ?? "";
            const isMe = member.user_id === myMember?.user_id;
            const isOwner = member.role === "owner";
            const isLast = i === activeMembers.length - 1;

            return (
              <div
                key={member.id}
                className="grid items-center px-5 py-4 transition hover:bg-white/[0.025]"
                style={{
                  gridTemplateColumns: "1fr auto auto",
                  borderBottom: isLast ? "none" : "1px solid rgba(196,173,255,0.06)",
                }}
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={name} avatarUrl={member.profiles?.avatar_url ?? null} size={38} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{name}</span>
                      {isMe && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(196,173,255,0.1)", color: "rgba(196,173,255,0.6)" }}>
                          Вы
                        </span>
                      )}
                      <RoleBadge role={member.role} />
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{email}</div>
                  </div>
                </div>

                {/* Date */}
                <div className="text-xs mr-8" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {formatDate(member.joined_at)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Изменить роль — только owner, не для себя, не для другого owner */}
                  {myMember?.role === "owner" && !isMe && !isOwner && (
                    <button
                      onClick={() => setChangeRoleFor(member)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-white/10"
                      style={{ color: "rgba(196,173,255,0.7)" }}
                      title="Изменить роль"
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Роль
                    </button>
                  )}

                  {/* Деактивировать — только owner, не для себя */}
                  {myMember?.role === "owner" && !isMe && (
                    <button
                      onClick={() => handleDeactivate(member.id)}
                      disabled={deactivating === member.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-red-500/10 disabled:opacity-50"
                      style={{ color: "rgba(248,113,113,0.7)" }}
                      title="Отключить доступ"
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                      {deactivating === member.id ? "..." : "Отключить"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pending приглашения ── */}
        {canManage && invitations.length > 0 && (
          <div>
            <div className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
              Ожидают принятия — {invitations.length}
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(251,191,36,0.15)" }}
            >
              {invitations.map((inv, i) => {
                const isLast = i === invitations.length - 1;
                const isExpired = new Date(inv.expires_at) < new Date();

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid rgba(251,191,36,0.08)",
                      background: "rgba(251,191,36,0.03)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Иконка-заглушка */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
                      >
                        <svg width="16" height="16" fill="none" stroke="#fbbf24" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{inv.email}</span>
                          <RoleBadge role={inv.role} />
                          {isExpired && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                              Истекло
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {inv.name ? `${inv.name} · ` : ""}Действует до {formatDate(inv.expires_at)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke(inv.id)}
                      disabled={revoking === inv.id}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-red-500/10 disabled:opacity-50"
                      style={{ color: "rgba(248,113,113,0.7)", border: "1px solid rgba(248,113,113,0.15)" }}
                    >
                      {revoking === inv.id ? "..." : "Отозвать"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Пустой state для не-owner/admin */}
        {!canManage && activeMembers.length === 1 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ border: "1px solid rgba(196,173,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Вы пока единственный сотрудник в компании
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSent={() => {
            setShowInvite(false);
            showToast("Приглашение отправлено");
            void load();
          }}
        />
      )}

      {changeRoleFor && (
        <ChangeRoleModal
          member={changeRoleFor}
          onClose={() => setChangeRoleFor(null)}
          onChanged={() => {
            setChangeRoleFor(null);
            showToast("Роль изменена");
            void load();
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl z-50 transition"
          style={{
            background: toast.ok ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
            border: `1px solid ${toast.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: toast.ok ? "#34d399" : "#f87171",
            backdropFilter: "blur(8px)",
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}