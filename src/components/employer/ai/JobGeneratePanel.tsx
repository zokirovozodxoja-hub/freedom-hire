"use client";
// src/components/employer/ai/JobGeneratePanel.tsx
//
// Панель AI-генерации вакансии.
// Встраивается в форму создания вакансии как выдвижная панель.
// При применении — заполняет все поля формы через onApply().

import { useState } from "react";
import type { JobGenerateInput, JobGenerateOutput } from "@/lib/ai/types";

// ─── Types ──────────────────────────────────────────────────

export type ApplyPayload = {
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  company_offers: string;
  tags: string[];
  salary_from?: number;
  salary_to?: number;
};

interface JobGeneratePanelProps {
  // Контекст компании для лучшей генерации
  companyName?: string;
  companyDescription?: string;
  // Подсказки из уже заполненных полей формы
  hints?: JobGenerateInput["hints"];
  // Коллбэк — применить результат к форме
  onApply: (payload: ApplyPayload) => void;
  // Закрыть панель
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

async function generateJob(
  input: JobGenerateInput
): Promise<{ ok: true; data: JobGenerateOutput } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/ai/job-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.ok) return { ok: false, message: json.error?.message ?? "Ошибка генерации" };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Ошибка соединения" };
  }
}

// ─── Sub-components ─────────────────────────────────────────

function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0"
      style={{ borderColor: "rgba(196,173,255,0.3)", borderTopColor: "var(--lavender)" }} />
  );
}

function FieldPreview({
  label,
  value,
  rows = 3,
}: {
  label: string;
  value: string;
  rows?: number;
}) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-xs mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label}
      </p>
      <div
        className="w-full rounded-xl px-3.5 py-3 text-sm whitespace-pre-line"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.85)",
          minHeight: `${rows * 1.6}rem`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TagsPreview({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div>
      <p className="text-xs mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
        Рекомендуемые навыки
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(92,46,204,0.2)",
              color: "var(--lavender)",
              border: "1px solid rgba(124,74,232,0.3)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function JobGeneratePanel({
  companyName,
  companyDescription,
  hints,
  onApply,
  onClose,
}: JobGeneratePanelProps) {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<JobGenerateOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Быстрые примеры промптов
  const quickPrompts = [
    "Frontend разработчик React, 2+ года, Ташкент",
    "Менеджер по продажам B2B, опыт от 3 лет",
    "Бухгалтер с опытом 1С, удалёнка",
    "Java backend разработчик, senior уровень",
  ];

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setStep("loading");
    setError(null);

    const res = await generateJob({
      prompt: prompt.trim(),
      company_name: companyName,
      company_description: companyDescription,
      hints,
    });

    if (!res.ok) {
      setError(res.message);
      setStep("input");
      return;
    }

    setResult(res.data);
    setStep("result");
  }

  function handleApply() {
    if (!result) return;
    onApply({
      title: result.title,
      description: result.description,
      responsibilities: result.responsibilities,
      requirements: result.requirements,
      benefits: result.benefits,
      company_offers: result.company_offers,
      tags: result.suggested_tags,
      salary_from: result.suggested_salary_from,
      salary_to: result.suggested_salary_to,
    });
  }

  function handleRegenerate() {
    setResult(null);
    setStep("input");
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "var(--deep)",
          border: "1px solid rgba(196,173,255,0.15)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(92,46,204,0.2)",
                border: "1px solid rgba(92,46,204,0.35)",
              }}
            >
              <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI-генератор вакансии</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {step === "result" ? "Проверьте и примените результат" : "Опишите вакансию — AI заполнит форму"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: INPUT ── */}
          {(step === "input" || step === "loading") && (
            <div className="p-5 space-y-4">
              {/* Info banner */}
              <div
                className="rounded-xl p-3 text-xs flex items-start gap-2.5"
                style={{
                  background: "rgba(92,46,204,0.08)",
                  border: "1px solid rgba(92,46,204,0.2)",
                }}
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  AI заполнит все поля вакансии — вы сможете отредактировать результат перед публикацией.
                  {companyName && (
                    <> Используется контекст компании <strong className="text-white">{companyName}</strong>.</>
                  )}
                </span>
              </div>

              {/* Prompt input */}
              <div>
                <label className="text-xs block mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Опишите вакансию кратко *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                  }}
                  placeholder="Например: Senior Python разработчик, опыт с Django и FastAPI от 3 лет, Ташкент или remote, зарплата 2000-3000 USD"
                  rows={3}
                  disabled={step === "loading"}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none transition"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(196,173,255,0.12)",
                  }}
                />
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Ctrl+Enter — сгенерировать
                </p>
              </div>

              {/* Quick prompts */}
              <div>
                <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Быстрый старт:
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp}
                      onClick={() => setPrompt(qp)}
                      disabled={step === "loading"}
                      className="text-xs px-3 py-1.5 rounded-lg transition hover:border-purple-500/40 disabled:opacity-40"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.55)",
                      }}
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: LOADING ── */}
          {step === "loading" && (
            <div className="px-5 pb-5">
              <div
                className="rounded-xl p-6 flex flex-col items-center gap-4 text-center"
                style={{
                  background: "rgba(92,46,204,0.06)",
                  border: "1px solid rgba(92,46,204,0.15)",
                }}
              >
                <Spinner />
                <div>
                  <p className="text-sm font-medium text-white">Генерирую вакансию...</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Обычно занимает 5-10 секунд
                  </p>
                </div>
                {/* Анимированные точки */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--lavender)",
                        animationDelay: `${i * 0.15}s`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === "result" && result && (
            <div className="p-5 space-y-4">
              {/* Generation notes */}
              {result.generation_notes && (
                <div
                  className="rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2"
                  style={{
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>AI предположил: {result.generation_notes}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <p className="text-xs mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Название вакансии
                </p>
                <div
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
                  style={{
                    background: "rgba(92,46,204,0.15)",
                    border: "1px solid rgba(92,46,204,0.3)",
                  }}
                >
                  {result.title}
                </div>
              </div>

              <FieldPreview label="Описание" value={result.description} rows={4} />
              <FieldPreview label="Обязанности" value={result.responsibilities} rows={5} />
              <FieldPreview label="Требования" value={result.requirements} rows={5} />
              <FieldPreview label="Условия и бенефиты" value={result.benefits} rows={3} />
              <FieldPreview label="Что предлагает компания" value={result.company_offers} rows={3} />

              {/* Salary suggestion */}
              {(result.suggested_salary_from || result.suggested_salary_to) && (
                <div>
                  <p className="text-xs mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Рекомендуемая зарплата (будет применена)
                  </p>
                  <div
                    className="rounded-xl px-3.5 py-2.5 text-sm"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {result.suggested_salary_from?.toLocaleString()} —{" "}
                    {result.suggested_salary_to?.toLocaleString()} сум
                  </div>
                </div>
              )}

              <TagsPreview tags={result.suggested_tags} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex gap-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {step === "input" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm transition hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Отмена
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Сгенерировать
              </button>
            </>
          )}

          {step === "loading" && (
            <button
              onClick={() => setStep("input")}
              className="flex-1 py-2.5 rounded-xl text-sm transition"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Отмена
            </button>
          )}

          {step === "result" && (
            <>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 transition hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Заново
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Применить к форме
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
