"use client";
// src/components/employer/ai/CandidateScorePanel.tsx
// Панель AI-анализа кандидатов на странице откликов.
// Показывает прогресс анализа, затем результаты с сортировкой.

import { useState } from "react";
import type { CandidateScoreOutput } from "@/lib/ai/types";

// ─── Types ────────────────────────────────────────────

export type CandidateForScore = {
  candidate_id: string;
  full_name?: string | null;
  headline?: string | null;
  about?: string | null;
  skills?: { name: string; level: string }[];
  experiences?: { company: string | null; position: string | null; start_date: string | null; end_date: string | null }[];
  cover_letter?: string | null;
};

export type JobForScore = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  experience_level: string;
};

interface CandidateScorePanelProps {
  job: JobForScore;
  candidates: CandidateForScore[];
  onClose: () => void;
  // Коллбэк — передаём оценки наверх чтобы отобразить на карточках
  onScoresReady: (scores: Record<string, CandidateScoreOutput>) => void;
}

// ─── Helpers ──────────────────────────────────────────

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "rgba(34,197,94,0.15)",  text: "#22c55e", border: "rgba(34,197,94,0.3)",  label: "Отлично" },
  B: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa", border: "rgba(96,165,250,0.3)", label: "Хорошо" },
  C: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)", label: "Средне" },
  D: { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.3)",  label: "Слабо" },
};

const RECOMMEND_STYLE: Record<string, { label: string; color: string }> = {
  invite:    { label: "Пригласить",   color: "#22c55e" },
  consider:  { label: "Рассмотреть",  color: "#fbbf24" },
  skip:      { label: "Пропустить",   color: "#f87171" },
};

function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const s = GRADE_STYLE[grade] ?? GRADE_STYLE.D;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
        {grade} · {score}%
      </span>
      <span className="text-xs" style={{ color: s.text }}>{s.label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

export function CandidateScorePanel({
  job,
  candidates,
  onClose,
  onScoresReady,
}: CandidateScorePanelProps) {
  const [step, setStep] = useState<"confirm" | "loading" | "results">("confirm");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CandidateScoreOutput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function runAnalysis() {
    setStep("loading");
    setError(null);
    setProgress(10);

    try {
      // Имитируем прогресс пока ждём ответ
      const progressTimer = setInterval(() => {
        setProgress(p => Math.min(p + 8, 85));
      }, 800);

      const res = await fetch("/api/ai/candidate-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job,
          candidates: candidates.map(c => ({
            candidate_id: c.candidate_id,
            full_name: c.full_name,
            headline: c.headline,
            about: c.about,
            skills: c.skills ?? [],
            experiences: (c.experiences ?? []).map(e => ({
              company: e.company ?? "",
              position: e.position ?? "",
              start_date: e.start_date,
              end_date: e.end_date,
            })),
            cover_letter: c.cover_letter,
          })),
        }),
      });

      clearInterval(progressTimer);
      setProgress(100);

      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Ошибка анализа");

      const scores = json.data as CandidateScoreOutput[];
      setResults(scores);

      // Передаём оценки в родительский компонент
      const scoresMap: Record<string, CandidateScoreOutput> = {};
      scores.forEach(s => { scoresMap[s.candidate_id] = s; });
      onScoresReady(scoresMap);

      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setStep("confirm");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--deep)", border: "1px solid rgba(196,173,255,0.15)", maxHeight: "88vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.35)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI-анализ кандидатов</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {step === "results"
                  ? `${results.length} кандидатов оценено`
                  : `${candidates.length} кандидатов · ${job.title}`}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-4 text-sm space-y-2"
                style={{ background: "rgba(92,46,204,0.07)", border: "1px solid rgba(92,46,204,0.18)" }}>
                <p className="font-medium" style={{ color: "var(--lavender)" }}>AI проверит каждого кандидата:</p>
                {[
                  "Соответствие требованиям вакансии",
                  "Релевантный опыт и навыки",
                  "Оценка 0-100 и grade A/B/C/D",
                  "Рекомендация: пригласить / рассмотреть / пропустить",
                ].map(t => (
                  <div key={t} className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <svg className="w-3 h-3 shrink-0" style={{ color: "#22c55e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", color: "rgba(255,255,255,0.55)" }}>
                <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Анализ {candidates.length} кандидатов займёт ~{Math.ceil(candidates.length * 3)} секунд
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── LOADING ── */}
          {step === "loading" && (
            <div className="p-5 space-y-5">
              <div className="rounded-xl p-6 flex flex-col items-center gap-4 text-center"
                style={{ background: "rgba(92,46,204,0.06)", border: "1px solid rgba(92,46,204,0.15)" }}>
                <div className="w-10 h-10 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
                <div>
                  <p className="text-sm font-medium text-white">Анализирую кандидатов...</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Оцениваю каждого по требованиям вакансии
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "var(--lavender)" }} />
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{progress}%</p>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === "results" && (
            <div className="p-5 space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-2">
                {(["A","B","C","D"] as const).map(grade => {
                  const count = results.filter(r => r.grade === grade).length;
                  const s = GRADE_STYLE[grade];
                  return (
                    <div key={grade} className="rounded-xl p-3 text-center"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <div className="text-lg font-bold" style={{ color: s.text }}>{count}</div>
                      <div className="text-xs mt-0.5" style={{ color: s.text, opacity: 0.8 }}>Grade {grade}</div>
                    </div>
                  );
                })}
              </div>

              {/* Candidate list */}
              <div className="space-y-2">
                {results.map((r, i) => {
                  const candidate = candidates.find(c => c.candidate_id === r.candidate_id);
                  const isExpanded = expandedId === r.candidate_id;
                  const rec = RECOMMEND_STYLE[r.recommendation];

                  return (
                    <div key={r.candidate_id}
                      className="rounded-xl overflow-hidden cursor-pointer transition"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                      onClick={() => setExpandedId(isExpanded ? null : r.candidate_id)}>

                      {/* Row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xs w-5 text-center shrink-0"
                          style={{ color: "rgba(255,255,255,0.3)" }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {candidate?.full_name || "Кандидат"}
                          </p>
                          {candidate?.headline && (
                            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                              {candidate.headline}
                            </p>
                          )}
                        </div>
                        <GradeBadge grade={r.grade} score={r.score} />
                        <svg className="w-4 h-4 shrink-0 transition-transform"
                          style={{ color: "rgba(255,255,255,0.3)", transform: isExpanded ? "rotate(180deg)" : "none" }}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-sm pt-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {r.summary}
                          </p>

                          {r.strengths?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1.5" style={{ color: "#22c55e" }}>
                                Сильные стороны
                              </p>
                              <div className="space-y-1">
                                {r.strengths.map((s, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs"
                                    style={{ color: "rgba(255,255,255,0.65)" }}>
                                    <span className="mt-0.5" style={{ color: "#22c55e" }}>+</span>
                                    {s}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.gaps?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1.5" style={{ color: "#f87171" }}>
                                Пробелы
                              </p>
                              <div className="space-y-1">
                                {r.gaps.map((g, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs"
                                    style={{ color: "rgba(255,255,255,0.65)" }}>
                                    <span className="mt-0.5" style={{ color: "#f87171" }}>−</span>
                                    {g}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              Рекомендация:
                            </span>
                            <span className="text-xs font-semibold" style={{ color: rec.color }}>
                              {rec.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {step === "confirm" && (
            <>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm transition hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                Отмена
              </button>
              <button onClick={runAnalysis}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Запустить анализ
              </button>
            </>
          )}
          {step === "results" && (
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
              Готово — оценки на карточках
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
