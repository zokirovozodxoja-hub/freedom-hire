"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  desired_position: string | null;
};

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  jobs: { title: string | null } | null;
  candidate?: Profile;
};

const STATUSES = [
  { key: "applied", label: "Новый", color: "rgba(196,173,255,0.15)", text: "var(--lavender)" },
  { key: "in_progress", label: "В работе", color: "rgba(201,168,76,0.15)", text: "var(--gold)" },
  { key: "invited", label: "Приглашён", color: "rgba(52,211,153,0.15)", text: "#6ee7b7" },
  { key: "rejected", label: "Отказ", color: "rgba(239,68,68,0.15)", text: "#f87171" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/auth");
        return;
      }

      // 1. Получаем компанию работодателя
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (!company) {
        router.replace("/onboarding/employer");
        return;
      }

      // 2. Получаем ID вакансий только этой компании
      const { data: jobsList } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", company.id);

      const jobIds = (jobsList ?? []).map((j) => j.id);

      if (jobIds.length === 0) {
        setApps([]);
        setLoading(false);
        return;
      }

      // 3. Отклики только на вакансии этой компании (БЕЗ profiles)
      const { data, error: appsError } = await supabase
        .from("applications")
        .select("id,job_id,candidate_id,status,created_at,cover_letter,jobs(title)")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (appsError) {
        setError(appsError.message);
        setApps([]);
        setLoading(false);
        return;
      }

      // 4. Получаем профили кандидатов отдельным запросом
      const candidateIds = [...new Set((data ?? []).map((app) => app.candidate_id))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,city,desired_position")
        .in("id", candidateIds);

      // 5. Объединяем данные
      const profilesMap = new Map(
        (profiles ?? []).map((p) => [p.id, p as Profile])
      );

      const appsWithProfiles = (data ?? []).map((app) => ({
        ...app,
        candidate: profilesMap.get(app.candidate_id),
      }));

      setApps(appsWithProfiles as unknown as Application[]);
      setLoading(false);
    })();
  }, [router]);

  async function updateStatus(appId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (!error) {
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    }
  }

  const filtered = filter ? apps.filter((a) => a.status === filter) : apps;

  const statusInfo = (key: string) =>
    STATUSES.find((s) => s.key === key) ?? {
      label: key,
      color: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.5)",
    };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="font-body text-white/40">Загружаем отклики...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="border-b" style={{ borderColor: "rgba(196,173,255,0.08)" }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "var(--lavender)" }}>
                КАБИНЕТ РАБОТОДАТЕЛЯ
              </div>
              <h1 className="font-display text-4xl" style={{ color: "var(--chalk)" }}>
                Отклики
              </h1>
              <p className="font-body text-white/40 text-sm mt-1">{apps.length} всего</p>
            </div>
            <Link
              href="/employer"
              className="font-body text-sm px-4 py-2 rounded-xl transition"
              style={{ border: "1px solid rgba(196,173,255,0.15)", color: "var(--lavender)" }}
            >
              ← Кабинет
            </Link>
          </div>

          {/* Фильтр по статусу */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => setFilter("")}
              className="px-4 py-1.5 rounded-xl text-sm font-body transition"
              style={{
                background: !filter ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.05)",
                border: !filter
                  ? "1px solid rgba(196,173,255,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: !filter ? "var(--lavender)" : "rgba(255,255,255,0.5)",
              }}
            >
              Все ({apps.length})
            </button>
            {STATUSES.map((s) => {
              const count = apps.filter((a) => a.status === s.key).length;
              return (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className="px-4 py-1.5 rounded-xl text-sm font-body transition"
                  style={{
                    background: filter === s.key ? s.color : "rgba(255,255,255,0.05)",
                    border:
                      filter === s.key
                        ? `1px solid ${s.text}40`
                        : "1px solid rgba(255,255,255,0.08)",
                    color: filter === s.key ? s.text : "rgba(255,255,255,0.5)",
                  }}
                >
                  {s.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl font-body text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="brand-card rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-body text-white/40">Откликов пока нет</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => {
              const si = statusInfo(app.status);
              const candidateName =
                app.candidate?.full_name ||
                app.candidate?.email ||
                "Кандидат";
              const candidateInitial = candidateName[0].toUpperCase();

              return (
                <div key={app.id} className="brand-card rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Кандидат */}
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-accent text-sm shrink-0"
                          style={{
                            background: "rgba(92,46,204,0.25)",
                            color: "var(--lavender)",
                          }}
                        >
                          {candidateInitial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-body font-semibold text-white text-sm truncate">
                            {candidateName}
                          </div>
                          <div className="font-body text-xs text-white/40 truncate">
                            {app.candidate?.email || "Email не указан"}
                          </div>
                          {app.candidate?.desired_position && (
                            <div className="font-body text-xs text-white/30">
                              {app.candidate.desired_position}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-body">
                        <span className="text-white/40">
                          На вакансию:{" "}
                          <span className="text-white/70">{app.jobs?.title ?? "—"}</span>
                        </span>
                        <span className="text-white/25">·</span>
                        <span className="text-white/40">{formatDate(app.created_at)}</span>
                        {app.candidate?.city && (
                          <>
                            <span className="text-white/25">·</span>
                            <span className="text-white/40">{app.candidate.city}</span>
                          </>
                        )}
                      </div>

                      {app.cover_letter && (
                        <div
                          className="mt-3 px-3 py-2 rounded-xl font-body text-sm text-white/50 line-clamp-2"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {app.cover_letter}
                        </div>
                      )}

                      {/* Кнопки действий */}
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/candidates/${app.candidate_id}`}
                          className="text-xs px-3 py-1.5 rounded-xl font-body transition"
                          style={{
                            background: "rgba(92,46,204,0.15)",
                            border: "1px solid rgba(196,173,255,0.2)",
                            color: "var(--lavender)",
                          }}
                        >
                          👤 Профиль кандидата
                        </Link>
                        {app.candidate?.phone && (
                          <a
                            href={`tel:${app.candidate.phone}`}
                            className="text-xs px-3 py-1.5 rounded-xl font-body transition"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.7)",
                            }}
                          >
                            📞 Позвонить
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Статус + управление */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span
                        className="text-xs px-3 py-1 rounded-full font-accent"
                        style={{ background: si.color, color: si.text }}
                      >
                        {si.label.toUpperCase()}
                      </span>
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className="text-xs rounded-xl px-3 py-1.5 font-body cursor-pointer focus:outline-none"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
