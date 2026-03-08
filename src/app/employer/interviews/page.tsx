"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────

type Interview = {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  stage: "stage_1" | "stage_2" | "final";
  status: "scheduled" | "rescheduled" | "completed" | "cancelled" | "no_show";
  scheduled_at: string;
  duration_minutes: number;
  title: string | null;
  location: string | null;
  meeting_link: string | null;
  created_at: string;
  jobs: { title: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

// ─── Constants ───────────────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  stage_1: { label: "Этап 1", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  stage_2: { label: "Этап 2", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  final:   { label: "Финал",  color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled:   { label: "Запланировано", color: "#60a5fa" },
  rescheduled: { label: "Перенесено",    color: "#fbbf24" },
  completed:   { label: "Завершено",     color: "#34d399" },
  cancelled:   { label: "Отменено",      color: "#f87171" },
  no_show:     { label: "Не явился",     color: "#e11d48" },
};

// ─── Components ──────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_LABELS[stage] || STAGE_LABELS.stage_1;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}33` }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.scheduled;
  return (
    <span className="text-xs font-medium" style={{ color: s.color }}>
      {s.label}
    </span>
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

// ─── Main Component ──────────────────────────────────────────────

export default function EmployerInterviewsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

    // Загружаем интервью компании
    const { data } = await supabase
      .from("interviews")
      .select(`
        id, application_id, job_id, candidate_id, stage, status,
        scheduled_at, duration_minutes, title, location, meeting_link, created_at,
        jobs(title),
        profiles:candidate_id(full_name, email)
      `)
      .eq("company_id", member.company_id)
      .order("scheduled_at", { ascending: true });

    setInterviews((data || []) as unknown as Interview[]);
    setLoading(false);
  }

  function formatDateTime(iso: string) {
    const date = new Date(iso);
    return date.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }

  if (loading) return <Spinner />;

  // Фильтрация
  const filteredInterviews = interviews.filter(i => {
    if (filterStage !== "all" && i.stage !== filterStage) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  // Группировка по датам
  const upcoming = filteredInterviews.filter(i => 
    new Date(i.scheduled_at) > new Date() && 
    i.status === "scheduled"
  );
  const past = filteredInterviews.filter(i => 
    new Date(i.scheduled_at) <= new Date() || 
    i.status !== "scheduled"
  );

  return (
    <div className="min-h-screen text-white p-6" style={{ background: "var(--ink)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link href="/employer" className="hover:text-white transition">Кабинет</Link>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Интервью</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Интервью</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {interviews.length} {interviews.length === 1 ? "интервью" : "интервью"}
            </p>
          </div>

          <Link
            href="/employer/interviews/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4"/>
            </svg>
            Назначить интервью
          </Link>
        </div>

        {/* Filters */}
        {interviews.length > 0 && (
          <div className="flex gap-3 mb-6">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="all">Все этапы</option>
              <option value="stage_1">Этап 1</option>
              <option value="stage_2">Этап 2</option>
              <option value="final">Финал</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.12)",
                color: "white",
                outline: "none",
              }}
            >
              <option value="all">Все статусы</option>
              <option value="scheduled">Запланировано</option>
              <option value="completed">Завершено</option>
              <option value="cancelled">Отменено</option>
            </select>
          </div>
        )}

        {/* Upcoming Interviews */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Предстоящие — {upcoming.length}
            </h2>
            <div className="space-y-3">
              {upcoming.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/employer/interviews/${interview.id}`}
                  className="block rounded-2xl p-5 transition hover:bg-white/[0.03]"
                  style={{ border: "1px solid rgba(196,173,255,0.12)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StageBadge stage={interview.stage} />
                        <StatusBadge status={interview.status} />
                      </div>
                      
                      <h3 className="font-semibold text-white mb-1">
                        {interview.title || interview.jobs?.title || "Интервью"}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          {interview.profiles?.full_name || interview.profiles?.email || "Кандидат"}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatDateTime(interview.scheduled_at)}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 8v4l3 3"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          {interview.duration_minutes} мин
                        </div>
                      </div>
                    </div>

                    <svg width="20" height="20" fill="none" stroke="rgba(196,173,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Past Interviews */}
        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              Прошедшие — {past.length}
            </h2>
            <div className="space-y-3">
              {past.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/employer/interviews/${interview.id}`}
                  className="block rounded-2xl p-5 transition hover:bg-white/[0.03]"
                  style={{ border: "1px solid rgba(196,173,255,0.08)", background: "rgba(255,255,255,0.01)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StageBadge stage={interview.stage} />
                        <StatusBadge status={interview.status} />
                      </div>
                      
                      <h3 className="font-semibold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {interview.title || interview.jobs?.title || "Интервью"}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span>{interview.profiles?.full_name || interview.profiles?.email}</span>
                        <span>{formatDateTime(interview.scheduled_at)}</span>
                      </div>
                    </div>

                    <svg width="20" height="20" fill="none" stroke="rgba(196,173,255,0.3)" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {interviews.length === 0 && (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: "1px solid rgba(196,173,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              Нет интервью
            </h3>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              Назначьте первое интервью с кандидатом
            </p>
            <Link
              href="/employer/applications"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: "rgba(92,46,204,0.15)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}
            >
              Посмотреть отклики
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}