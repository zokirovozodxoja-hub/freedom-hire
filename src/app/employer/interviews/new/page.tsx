"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────

type Application = {
  id: string;
  candidate_id: string;
  job_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  jobs: {
    title: string | null;
  } | null;
};

type CompanyMember = {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

// ─── Component ────────────────────────────────────────────────────

export default function NewInterviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  // Form state
  const [applicationId, setApplicationId] = useState("");
  const [stage, setStage] = useState<"stage_1" | "stage_2" | "final">("stage_1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    // Читаем application из URL
    const params = new URLSearchParams(window.location.search);
    const appId = params.get("application");
    if (appId) {
      setApplicationId(appId);
    }
    void load(); 
  }, []);

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
    if (!["owner", "admin", "recruiter"].includes(member.role)) {
      router.replace("/employer/interviews");
      return;
    }

    setCompanyId(member.company_id);

    // Загружаем отклики - все статусы (не только new/screening)
    const { data: apps, error: appsError } = await supabase
      .from("applications")
      .select(`
        id, candidate_id, job_id, status,
        profiles:candidate_id(full_name, email),
        jobs(title, company_id)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    console.log("Applications loaded:", apps, "Error:", appsError);
    
    // Фильтруем только отклики нашей компании
    const companyApps = (apps || []).filter(app => 
      (app as any).jobs?.company_id === member.company_id
    );
    
    setApplications(companyApps as unknown as Application[]);

    // Загружаем команду для выбора участников
    const { data: teamMembers } = await supabase
      .from("company_members")
      .select(`
        id, user_id, role,
        profiles:user_id(full_name, email)
      `)
      .eq("company_id", member.company_id)
      .eq("status", "active");

    setMembers((teamMembers || []) as unknown as CompanyMember[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applicationId) { setError("Выберите кандидата"); return; }
    if (!scheduledDate || !scheduledTime) { setError("Укажите дату и время"); return; }

    setSaving(true);
    setError(null);

    try {
      const app = applications.find(a => a.id === applicationId);
      if (!app) throw new Error("Отклик не найден");

      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Создаём интервью (встреча будет создана позже через Daily.co)
      const { data: interview, error: intError } = await supabase
        .from("interviews")
        .insert({
          application_id: applicationId,
          job_id: app.job_id,
          candidate_id: app.candidate_id,
          company_id: companyId,
          stage,
          status: "scheduled",
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          title: title || null,
          location: "online",
          meeting_link: null, // Будет создана комната Daily.co позже
        })
        .select()
        .single();

      if (intError) throw intError;

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

      router.push(`/employer/interviews/${interview.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
      setSaving(false);
    }
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
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Назначить</span>
        </div>

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold">Назначить интервью</h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Выберите кандидата и настройте детали собеседования
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-8">

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
              <option value="" style={{ background: "#1a1a2e", color: "white" }}>Выберите кандидата...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id} style={{ background: "#1a1a2e", color: "white" }}>
                  {app.profiles?.full_name || app.profiles?.email} — {app.jobs?.title}
                </option>
              ))}
            </select>
            {applications.length === 0 && (
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Нет откликов для назначения интервью. <Link href="/employer/applications" className="text-lavender hover:underline">Посмотреть отклики</Link>
              </p>
            )}
          </div>

          {/* Этап */}
          <div>
            <label className="block text-sm font-medium mb-2">Этап интервью</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="stage_1" style={{ background: "#1a1a2e", color: "white" }}>Этап 1 — Первичное собеседование</option>
              <option value="stage_2" style={{ background: "#1a1a2e", color: "white" }}>Этап 2 — Техническое интервью</option>
              <option value="final" style={{ background: "#1a1a2e", color: "white" }}>Финальное интервью</option>
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
                  colorScheme: "dark",
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
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Длительность */}
          <div>
            <label className="block text-sm font-medium mb-2">Длительность</label>
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
              <option value={30} style={{ background: "#1a1a2e", color: "white" }}>30 минут</option>
              <option value={45} style={{ background: "#1a1a2e", color: "white" }}>45 минут</option>
              <option value={60} style={{ background: "#1a1a2e", color: "white" }}>1 час</option>
              <option value={90} style={{ background: "#1a1a2e", color: "white" }}>1.5 часа</option>
              <option value={120} style={{ background: "#1a1a2e", color: "white" }}>2 часа</option>
            </select>
          </div>

          {/* Название (опционально) */}
          <div>
            <label className="block text-sm font-medium mb-2">Название (опционально)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Техническое интервью с CTO"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          {/* Информация о видеовстрече */}
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#34d399" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "#34d399" }}>Видеовстреча на платформе</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Комната для видеозвонка будет создана автоматически. Ссылка отправится всем участникам.
                </div>
              </div>
            </div>
          </div>

          {/* Участники */}
          <div>
            <label className="block text-sm font-medium mb-3">Пригласить участников из команды (опционально)</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Нет сотрудников для приглашения
                </p>
              ) : (
                members.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition hover:bg-white/[0.03]"
                    style={{ border: "1px solid rgba(196,173,255,0.08)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipants([...selectedParticipants, member.id]);
                        } else {
                          setSelectedParticipants(selectedParticipants.filter(id => id !== member.id));
                        }
                      }}
                      className="w-4 h-4"
                      style={{ accentColor: "var(--lavender)" }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {member.profiles?.full_name || member.profiles?.email}
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {member.role}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || applications.length === 0}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
            >
              {saving ? "Создание..." : "Назначить интервью"}
            </button>
            <Link
              href="/employer/interviews"
              className="px-6 py-3 rounded-xl text-sm font-semibold transition"
              style={{ border: "1px solid rgba(196,173,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              Отмена
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}