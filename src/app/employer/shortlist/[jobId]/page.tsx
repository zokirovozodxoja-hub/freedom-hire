"use client";
// src/app/employer/shortlist/[jobId]/page.tsx
// Страница шортлиста — показывает топ кандидатов по AI-оценке.
// Позволяет убрать кандидата из шортлиста вручную.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────

type ShortlistEntry = {
  candidate_id: string;
  score: number;
  grade: string;
  summary: string;
  recommendation: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  experience_years: number | null;
  skills: { name: string; level: string }[];
};

type Shortlist = {
  shortlist_id: string;
  job_id: string;
  job_title: string;
  entries: ShortlistEntry[];
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "rgba(34,197,94,0.15)",  text: "#22c55e", border: "rgba(34,197,94,0.3)",  label: "Отлично" },
  B: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa", border: "rgba(96,165,250,0.3)", label: "Хорошо" },
  C: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)", label: "Средне" },
  D: { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.3)",  label: "Слабо" },
};

const RECOMMEND_LABEL: Record<string, { label: string; color: string }> = {
  invite:   { label: "Пригласить",  color: "#22c55e" },
  consider: { label: "Рассмотреть", color: "#fbbf24" },
  skip:     { label: "Пропустить",  color: "#f87171" },
};

// ─── Main Page ────────────────────────────────────────

export default function ShortlistPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(5);
  const [jobTitle, setJobTitle] = useState("");
  const [hasScores, setHasScores] = useState(false); // есть ли AI-оценки в БД

  useEffect(() => {
    loadShortlist();
    loadJobTitle();
    checkScores();
  }, [jobId]);

  async function loadJobTitle() {
    const supabase = createClient();
    const { data } = await supabase.from("jobs").select("title").eq("id", jobId).single();
    if (data?.title) setJobTitle(data.title);
  }

  // Проверяем есть ли оценки в localStorage
  async function checkScores() {
    try {
      const saved = localStorage.getItem("fh_ai_scores");
      const ts = localStorage.getItem("fh_ai_scores_ts");
      if (saved && ts && Date.now() - Number(ts) < 86400000) {
        const parsed = JSON.parse(saved);
        setHasScores(Object.keys(parsed).length > 0);
      } else {
        setHasScores(false);
      }
    } catch {
      setHasScores(false);
    }
  }

  async function loadShortlist() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/shortlist?job_id=${jobId}`);
      const json = await res.json();
      if (json.ok && json.data) {
        const d = json.data;
        setShortlist({
          shortlist_id: d.id,
          job_id: d.job_id,
          job_title: (d.jobs as any)?.title ?? "",
          entries: Array.isArray(d.scores) ? d.scores : [],
          created_at: d.created_at,
        });
      }
    } catch {}
    setLoading(false);
  }

  async function generateShortlist() {
    setGenerating(true);
    setError(null);
    try {
      // Читаем оценки из localStorage (сохранены при AI-анализе)
      let scores: { candidate_id: string; score: number; grade: string; summary: string; recommendation: string }[] = [];
      try {
        const saved = localStorage.getItem("fh_ai_scores");
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, any>;
          scores = Object.values(parsed).map((s: any) => ({
            candidate_id: s.candidate_id,
            score: s.score,
            grade: s.grade,
            summary: s.summary ?? "",
            recommendation: s.recommendation ?? "consider",
          }));
        }
      } catch {}

      if (!scores.length) {
        setError("Сначала запустите AI-анализ кандидатов на странице откликов");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/ai/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, limit, scores }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Ошибка создания шортлиста");
      } else {
        setShortlist(json.data);
        setRemoved(new Set());
      }
    } catch {
      setError("Ошибка соединения");
    }
    setGenerating(false);
  }

  async function removeFromShortlist(candidateId: string) {
    if (!shortlist) return;
    const newRemoved = new Set(removed);
    newRemoved.add(candidateId);
    setRemoved(newRemoved);

    // Обновляем в БД — сохраняем только оставшихся
    const remainingIds = shortlist.entries
      .filter(e => !newRemoved.has(e.candidate_id))
      .map(e => e.candidate_id);

    await fetch("/api/ai/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        limit: shortlist.entries.length,
        // API пересоздаст шортлист из БД — просто вызываем снова
      }),
    });
  }

  const visibleEntries = shortlist?.entries.filter(e => !removed.has(e.candidate_id)) ?? [];

  // ─── LOADING ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Загружаю шортлист...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6" style={{ background: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Хлебные крошки */}
        <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link href="/employer" className="hover:text-white transition">Кабинет</Link>
          <span>/</span>
          <Link href="/employer/applications" className="hover:text-white transition">Отклики</Link>
          <span>/</span>
          <span className="text-white">Шортлист</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl" style={{ color: "var(--chalk)" }}>
              Шортлист кандидатов
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {jobTitle || shortlist?.job_title || "Вакансия"}
            </p>
          </div>
          {shortlist && (
            <div className="text-xs px-3 py-1.5 rounded-xl shrink-0"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              {visibleEntries.length} кандидатов
            </div>
          )}
        </div>

        {/* ── Нет шортлиста — форма создания ── */}
        {!shortlist && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.25)" }}>
              <svg className="w-7 h-7" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-white mb-2">Создать шортлист</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              AI выберет лучших кандидатов на основе оценок скоринга.<br />
              Убедитесь, что сначала запустили AI-анализ на странице откликов.
            </p>

            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Топ кандидатов:</span>
              {[3, 5, 10].map(n => (
                <button key={n} onClick={() => setLimit(n)}
                  className="w-10 h-10 rounded-xl text-sm font-semibold transition"
                  style={{
                    background: limit === n ? "rgba(92,46,204,0.35)" : "rgba(255,255,255,0.05)",
                    color: limit === n ? "var(--lavender)" : "rgba(255,255,255,0.5)",
                    border: limit === n ? "1px solid rgba(196,173,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  }}>
                  {n}
                </button>
              ))}
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm mb-4 text-left"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
                {!hasScores && (
                  <Link href="/employer/applications"
                    className="block mt-2 underline" style={{ color: "var(--lavender)" }}>
                    → Перейти к откликам и запустить анализ
                  </Link>
                )}
              </div>
            )}

            {!hasScores && !error && (
              <div className="rounded-xl px-4 py-3 text-sm mb-4"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                AI-анализ для этой вакансии ещё не запущен.{" "}
                <Link href="/employer/applications" className="underline" style={{ color: "var(--lavender)" }}>
                  Запустить анализ →
                </Link>
              </div>
            )}

            <button onClick={generateShortlist} disabled={generating || !hasScores}
              className="px-8 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2 mx-auto transition"
              style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
              {generating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                  Создаю шортлист...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Создать шортлист топ-{limit}
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Шортлист есть — список кандидатов ── */}
        {shortlist && (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {(["A","B","C","D"] as const).map(grade => {
                const count = visibleEntries.filter(e => e.grade === grade).length;
                const s = GRADE_STYLE[grade];
                return (
                  <div key={grade} className="rounded-xl p-3 text-center"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="text-2xl font-bold" style={{ color: s.text }}>{count}</div>
                    <div className="text-xs mt-0.5" style={{ color: s.text, opacity: 0.85 }}>Grade {grade}</div>
                  </div>
                );
              })}
            </div>

            {/* Candidate cards */}
            <div className="space-y-3 mb-6">
              {visibleEntries.map((entry, i) => {
                const g = GRADE_STYLE[entry.grade] ?? GRADE_STYLE.D;
                const rec = RECOMMEND_LABEL[entry.recommendation];
                return (
                  <div key={entry.candidate_id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

                    {/* Top row */}
                    <div className="flex items-center gap-4 p-5">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: i < 3 ? "rgba(92,46,204,0.25)" : "rgba(255,255,255,0.06)",
                          color: i < 3 ? "var(--lavender)" : "rgba(255,255,255,0.4)",
                          border: i < 3 ? "1px solid rgba(196,173,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                        }}>
                        {i + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.25)" }}>
                        {(entry.full_name?.[0] ?? "?").toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">{entry.full_name ?? "Кандидат"}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: g.bg, color: g.text, border: `1px solid ${g.border}` }}>
                            {entry.grade} · {entry.score}%
                          </span>
                          {rec && (
                            <span className="text-xs font-medium" style={{ color: rec.color }}>
                              {rec.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {entry.headline && (
                            <span className="text-sm" style={{ color: "var(--lavender)" }}>
                              {entry.headline}
                            </span>
                          )}
                          {entry.city && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              📍 {entry.city}
                            </span>
                          )}
                          {entry.experience_years != null && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              💼 {entry.experience_years} лет
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/candidates/${entry.candidate_id}`}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition"
                          style={{
                            background: "rgba(92,46,204,0.2)",
                            color: "var(--lavender)",
                            border: "1px solid rgba(92,46,204,0.3)",
                          }}>
                          Профиль →
                        </Link>
                        <button
                          onClick={() => removeFromShortlist(entry.candidate_id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-500/20"
                          style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                          title="Убрать из шортлиста">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {entry.summary && (
                      <div className="px-5 pb-4">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {entry.summary}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    {entry.skills?.length > 0 && (
                      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                        {entry.skills.slice(0, 6).map((s, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(124,58,237,0.12)", color: "#C4ADFF", border: "1px solid rgba(124,58,237,0.2)" }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleEntries.length === 0 && (
                <div className="rounded-2xl p-8 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>Все кандидаты убраны из шортлиста</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-3">
              <Link href="/employer/applications"
                className="px-5 py-2.5 rounded-xl text-sm transition"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                ← К откликам
              </Link>
              <button onClick={generateShortlist} disabled={generating}
                className="px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
                style={{ background: "rgba(92,46,204,0.15)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.25)" }}>
                {generating ? (
                  <div className="w-3.5 h-3.5 rounded-full border animate-spin"
                    style={{ borderColor: "rgba(196,173,255,0.3)", borderTopColor: "var(--lavender)" }} />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Обновить шортлист
              </button>
            </div>

            <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
              Создан {new Date(shortlist.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
