"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Application = {
  id: string;
  job_id: string;
  status: string | null;
  cover_letter: string | null;
  created_at: string;
  conversation_id?: string | null;
  jobs: {
    title: string | null;
    city: string | null;
    salary_from: number | null;
    salary_to: number | null;
    companies: { name: string | null } | null;
  } | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string; hint?: string }> = {
  sent:        { label: "Отправлен",       color: "#93c5fd", bg: "rgba(147,197,253,0.1)",  border: "rgba(147,197,253,0.2)"  },
  applied:     { label: "Отправлен",       color: "#93c5fd", bg: "rgba(147,197,253,0.1)",  border: "rgba(147,197,253,0.2)"  },
  viewed:      { label: "Просмотрен",      color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.2)"   },
  in_progress: { label: "Рассматривается", color: "#C4ADFF", bg: "rgba(196,173,255,0.1)",  border: "rgba(196,173,255,0.2)"  },
  shortlisted: { label: "В шортлисте",     color: "#C4ADFF", bg: "rgba(196,173,255,0.1)",  border: "rgba(196,173,255,0.2)"  },
  invited:     { label: "Приглашён",       color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.2)"   },
  accepted:    { label: "Принят",          color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.2)"   },
  rejected:    { label: "Отказ",           color: "#f87171", bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.2)",
    hint: "Работодатель отклонил вашу кандидатуру. Проверьте чат — там может быть сообщение с причиной." },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
function formatSalary(from: number | null, to: number | null) {
  if (!from && !to) return null;
  const f = (n: number) => n.toLocaleString("ru-RU");
  if (from && to) return `${f(from)} – ${f(to)}`;
  if (from) return `от ${f(from)}`;
  return `до ${f(to!)}`;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/auth"); return; }
      const { data, error } = await supabase
        .from("applications")
        .select(`id, job_id, status, cover_letter, created_at,
          jobs ( title, city, salary_from, salary_to, companies ( name ) )`)
        .eq("candidate_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      
      // Загружаем conversations для каждого application
      const appsWithConv = await Promise.all((data ?? []).map(async (app: any) => {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("application_id", app.id)
          .maybeSingle();
        return { ...app, conversation_id: conv?.id ?? null };
      }));
      
      setApps(appsWithConv as unknown as Application[]);
      setLoading(false);
    })();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-3 pt-4">
          {[1, 2, 3].map(i => <div key={i} className="brand-card rounded-2xl animate-pulse" style={{ height: 96 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="font-accent text-xs mb-1" style={{ color: "var(--lavender)" }}>МОЙ КАБИНЕТ</div>
            <h1 className="font-display text-3xl" style={{ color: "var(--chalk)" }}>Мои отклики</h1>
            <p className="font-body text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {apps.length} {apps.length === 1 ? "отклик" : apps.length < 5 ? "отклика" : "откликов"}
            </p>
          </div>
          <Link href="/resume"
            className="rounded-xl px-4 py-2 text-sm font-body transition"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)" }}>
            Профиль
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3 text-sm font-body"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {apps.length === 0 ? (
          <div className="brand-card rounded-3xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.2)" }}>
              <svg className="w-6 h-6" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="font-body text-white/60 font-medium mb-1">Откликов пока нет</div>
            <div className="font-body text-sm mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Найдите подходящие вакансии и откликнитесь
            </div>
            <Link href="/jobs" className="btn-primary inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
              Смотреть вакансии
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => {
              const s = STATUS_MAP[app.status ?? "sent"] ?? STATUS_MAP.sent;
              const salary = formatSalary(app.jobs?.salary_from ?? null, app.jobs?.salary_to ?? null);
              return (
                <div key={app.id} className="brand-card rounded-2xl p-5"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${app.job_id}`}
                        className="font-semibold font-body block truncate transition"
                        style={{ color: "var(--chalk)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--lavender)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--chalk)")}>
                        {app.jobs?.title ?? "Вакансия удалена"}
                      </Link>
                      <div className="text-sm mt-0.5 font-body" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {[app.jobs?.companies?.name, app.jobs?.city, salary].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>

                  {s.hint && (
                    <div className="text-xs rounded-xl px-3 py-2 mb-3 flex items-start gap-2"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.85)" }}>
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {s.hint}
                    </div>
                  )}

                  {app.cover_letter && (
                    <div className="text-sm rounded-xl px-3 py-2 mb-3 line-clamp-2 font-body"
                      style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {app.cover_letter}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-3 pt-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-xs font-body" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {formatDate(app.created_at)}
                    </span>
                    {app.conversation_id ? (
                      <Link href={`/chat/${app.conversation_id}`}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition font-body"
                        style={{ background: "rgba(92,46,204,0.15)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.25)" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Чат с работодателем
                      </Link>
                    ) : (
                      <span className="text-xs px-3 py-1.5 rounded-xl font-body"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                        Чат будет доступен после ответа
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
