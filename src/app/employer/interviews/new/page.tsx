"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  jobs: { title: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

// ─── Main Component ──────────────────────────────────────────────

export default function NewInterviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  // Form state
  const [applicationId, setApplicationId] = useState("");
  const [stage, setStage] = useState<"stage_1" | "stage_2" | "final">("stage_1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/auth"); return; }

    const { data: member } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!member) { router.replace("/onboarding/employer"); return; }

    // Проверка прав (только owner, admin, recruiter)
    if (!["owner", "admin", "recruiter"].includes(member.role)) {
      router.replace("/employer");
      return;
    }

    setCompanyId(member.company_id);

    // Загружаем отклики
    const { data: jobIds } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", member.company_id)
      .eq("is_active", true);

    const ids = (jobIds || []).map(j => j.id);

    if (ids.length > 0) {
      const { data: apps } = await supabase
        .from("applications")
        .select(`
          id, job_id, candidate_id,
          jobs(title),
          profiles:candidate_id(full_name, email)
        `)
        .in("job_id", ids)
        .in("status", ["pending", "reviewed", "shortlisted"])
        .order("created_at", { ascending: false })
        .limit(50);

      setApplications((apps || []) as unknown as Application[]);
    }

    // Загружаем команду
    const { data: team } = await supabase
      .from("company_members")
      .select(`
        id, user_id, role,
        profiles:user_id(full_name, email)
      `)
      .eq("company_id", member.company_id)
      .eq("status", "active");

    setTeamMembers((team || []) as unknown as TeamMember[]);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!applicationId) {
      setError("Выберите кандидата");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setError("Укажите дату и время");
      return;
    }

    setSaving(true);

    try {
      // Находим application
      const app = applications.find(a => a.id === applicationId);
      if (!app) throw new Error("Отклик не найден");

      // Формируем datetime
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

      // Создаём интервью
      const { data: interview, error: insertError } = await supabase
        .from("interviews")
        .insert({
          application_id: applicationId,
          job_id: app.job_id,
          candidate_id: app.candidate_id,
          company_id: companyId,
          stage,
          status: "scheduled",
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: duration,
          title: title || null,
          location,
          meeting_link: meetingLink || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Добавляем участников
      if (selectedParticipants.length > 0) {
        const participants = selectedParticipants.map(memberId => ({
          interview_id: interview.id,
          member_id: memberId,
          role: "interviewer",
          status: "invited",
        }));

        await supabase.from("interview_participants").insert(participants);
      }

      // Редирект на страницу интервью
      router.push(`/employer/interviews/${interview.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
      setSaving(false);
    }
  }

  function toggleParticipant(memberId: string) {
    setSelectedParticipants(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  }

  if (loading) {
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

  return (
    <div className="min-h-screen text-white p-6" style={{ background: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link href="/employer" className="hover:text-white transition">Кабинет</Link>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <Link href="/employer/interviews" className="hover:text-white transition">Интервью</Link>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Назначить интервью</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Назначить интервью</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Выберите кандидата и настройте детали собеседования
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Кандидат */}
          <div>
            <label className="block text-sm font-medium mb-2">Кандидат</label>
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="">Выберите кандидата...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.profiles?.full_name || app.profiles?.email} — {app.jobs?.title}
                </option>
              ))}
            </select>
            {applications.length === 0 && (
              <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Нет откликов для назначения интервью.{" "}
                <Link href="/employer/applications" className="text-lavender hover:underline">
                  Посмотреть отклики
                </Link>
              </p>
            )}
          </div>

          {/* Этап */}
          <div>
            <label className="block text-sm font-medium mb-2">Этап интервью</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as any)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="stage_1">Этап 1 — Первичное собеседование</option>
              <option value="stage_2">Этап 2 — Техническое интервью</option>
              <option value="final">Финал — Собеседование с руководством</option>
            </select>
          </div>

          {/* Дата и время */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Дата</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(196,173,255,0.12)",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Время</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(196,173,255,0.12)",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Длительность */}
          <div>
            <label className="block text-sm font-medium mb-2">Длительность (минут)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value={30}>30 минут</option>
              <option value={45}>45 минут</option>
              <option value={60}>1 час</option>
              <option value={90}>1.5 часа</option>
              <option value={120}>2 часа</option>
            </select>
          </div>

          {/* Название (опционально) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Название интервью <span style={{ color: "rgba(255,255,255,0.3)" }}>(опционально)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Техническое интервью — Frontend разработчик"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          {/* Локация */}
          <div>
            <label className="block text-sm font-medium mb-2">Формат</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="online">Онлайн</option>
              <option value="office">Офис</option>
              <option value="phone">Телефон</option>
            </select>
          </div>

          {/* Ссылка на встречу */}
          {location === "online" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Ссылка на видеовстречу <span style={{ color: "rgba(255,255,255,0.3)" }}>(опционально)</span>
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(196,173,255,0.12)",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Участники */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Участники <span style={{ color: "rgba(255,255,255,0.3)" }}>(опционально)</span>
            </label>
            <div className="space-y-2">
              {teamMembers.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition hover:bg-white/5"
                  style={{ border: "1px solid rgba(196,173,255,0.08)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(member.id)}
                    onChange={() => toggleParticipant(member.id)}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--lavender)" }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {member.profiles?.full_name || member.profiles?.email}
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {member.role}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || applications.length === 0}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
            >
              {saving ? "Создание..." : "Назначить интервью"}
            </button>

            <Link
              href="/employer/interviews"
              className="px-6 py-3 rounded-xl font-semibold transition"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}
            >
              Отмена
            </Link>
          </div>

        </form>

      </div>
    </div>
  );
}