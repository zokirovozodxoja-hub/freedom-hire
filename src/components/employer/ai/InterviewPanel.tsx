"use client";
// src/components/employer/ai/InterviewPanel.tsx
// AI-интервью с динамическими вопросами и детектором AI-ответов

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────

type Message = {
  role: "interviewer" | "candidate";
  content: string;
  ai_flag?: boolean;
  ai_probability?: number;
  ai_reason?: string;
};

type EvalResult = {
  overall_score: number;
  grade: string;
  recommendation: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  ai_usage_detected: boolean;
  ai_usage_summary: string;
};

interface InterviewPanelProps {
  applicationId: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "rgba(34,197,94,0.15)",  text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  B: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa", border: "rgba(96,165,250,0.3)" },
  C: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  D: { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.3)" },
};

const REC_STYLE: Record<string, { label: string; color: string }> = {
  hire:    { label: "Нанять",      color: "#22c55e" },
  consider:{ label: "Рассмотреть", color: "#fbbf24" },
  reject:  { label: "Отклонить",   color: "#f87171" },
};

// ─── Main Component ───────────────────────────────────

export function InterviewPanel({
  applicationId,
  jobId,
  candidateId,
  candidateName,
  jobTitle,
  onClose,
}: InterviewPanelProps) {
  const [step, setStep] = useState<"loading" | "confirm" | "chat" | "evaluating" | "result">("confirm");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Проверяем существующее интервью
  useEffect(() => {
    checkExisting();
  }, [applicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function checkExisting() {
    setStep("loading");
    try {
      const res = await fetch(`/api/ai/interview?application_id=${applicationId}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setExistingInterview(json.data);
        if (json.data.status === "completed" && json.data.final_score) {
          // Восстанавливаем результат
          setMessages(Array.isArray(json.data.messages) ? json.data.messages : []);
          setEvaluation({
            overall_score: json.data.final_score,
            grade: scoreToGrade(json.data.final_score),
            recommendation: json.data.recommendation ?? "consider",
            summary: json.data.final_summary ?? "",
            strengths: [],
            concerns: [],
            ai_usage_detected: false,
            ai_usage_summary: "",
          });
          setStep("result");
          return;
        }
      }
    } catch {}
    setStep("confirm");
  }

  function scoreToGrade(score: number): string {
    if (score >= 85) return "A";
    if (score >= 65) return "B";
    if (score >= 45) return "C";
    return "D";
  }

  async function startInterview() {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          job_id: jobId,
          candidate_id: candidateId,
          application_id: applicationId,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка старта");

      setSessionId(json.data.session_id);
      setCurrentQuestion(json.data.question);
      setQuestionNumber(json.data.question_number);
      setMessages([{ role: "interviewer", content: json.data.question }]);
      setStep("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setStep("confirm");
    }
  }

  async function sendAnswer() {
    if (!answer.trim() || !sessionId || sending) return;
    const userAnswer = answer.trim();
    setAnswer("");
    setSending(true);

    // Оптимистично добавляем ответ
    setMessages(prev => [...prev, { role: "candidate", content: userAnswer }]);

    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", session_id: sessionId, answer: userAnswer }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");

      const { question, is_final, question_number, ai_detection } = json.data;

      // Обновляем последний ответ с AI-флагом
      setMessages(prev => {
        const updated = [...prev];
        const lastCandidateIdx = updated.map(m => m.role).lastIndexOf("candidate");
        if (lastCandidateIdx >= 0 && ai_detection) {
          updated[lastCandidateIdx] = {
            ...updated[lastCandidateIdx],
            ai_flag: ai_detection.flagged,
            ai_probability: ai_detection.probability,
            ai_reason: ai_detection.reason,
          };
        }
        return updated;
      });

      if (is_final) {
        setIsFinal(true);
        await runEvaluation();
      } else {
        setMessages(prev => [...prev, { role: "interviewer", content: question }]);
        setCurrentQuestion(question);
        setQuestionNumber(question_number + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
    setSending(false);
  }

  async function runEvaluation() {
    if (!sessionId) return;
    setStep("evaluating");
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", session_id: sessionId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка оценки");
      setEvaluation(json.data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка оценки");
      setStep("chat");
    }
  }

  const aiFlags = messages.filter(m => m.role === "candidate" && m.ai_flag).length;
  const totalAnswers = messages.filter(m => m.role === "candidate").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--deep)", border: "1px solid rgba(196,173,255,0.15)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 3H3v13l4 4h14V3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI-интервью</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {candidateName} · {jobTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step === "chat" && (
              <div className="flex items-center gap-1.5">
                {aiFlags > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                    AI-флаг: {aiFlags}/{totalAnswers}
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  {questionNumber}/5
                </span>
              </div>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* LOADING */}
          {(step === "loading" || step === "evaluating") && (
            <div className="flex flex-col items-center justify-center gap-4 p-12">
              <div className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                {step === "evaluating" ? "Составляю итоговую оценку..." : "Загружаю..."}
              </p>
            </div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && (
            <div className="p-6 space-y-4">
              {existingInterview && (
                <div className="rounded-xl p-3 text-sm"
                  style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                  Для этого кандидата уже есть интервью. Начать новое заменит предыдущее.
                </div>
              )}

              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(92,46,204,0.07)", border: "1px solid rgba(92,46,204,0.18)" }}>
                <p className="font-medium" style={{ color: "var(--lavender)" }}>Как работает AI-интервью:</p>
                {[
                  "5 динамических вопросов — каждый основан на предыдущем ответе",
                  "Уточняющие вопросы если ответ слишком общий",
                  "Детектор AI-текста — помечает подозрительные ответы",
                  "Итоговая оценка с рекомендацией и анализом честности",
                ].map(t => (
                  <div key={t} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <svg className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#22c55e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {step === "chat" && (
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl px-4 py-3 text-sm"
                      style={msg.role === "interviewer"
                        ? { background: "rgba(92,46,204,0.15)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(92,46,204,0.2)" }
                        : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.1)" }
                      }>
                      {msg.content}
                    </div>
                    {/* AI-флаг под ответом кандидата */}
                    {msg.role === "candidate" && msg.ai_flag && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-1">
                        <svg className="w-3 h-3 shrink-0" style={{ color: "#fbbf24" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-xs" style={{ color: "#fbbf24" }}>
                          Возможно использован AI · {msg.ai_probability}%
                        </span>
                      </div>
                    )}
                    {msg.role === "candidate" && msg.ai_flag === false && msg.ai_probability !== undefined && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-1">
                        <svg className="w-3 h-3 shrink-0" style={{ color: "#22c55e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs" style={{ color: "#22c55e" }}>Похоже на живой ответ</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ background: "rgba(92,46,204,0.1)", border: "1px solid rgba(92,46,204,0.15)" }}>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: "var(--lavender)", animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* RESULT */}
          {step === "result" && evaluation && (
            <div className="p-5 space-y-4">
              {/* Score header */}
              <div className="rounded-xl p-5 flex items-center gap-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: GRADE_STYLE[evaluation.grade]?.text ?? "#fff" }}>
                    {evaluation.overall_score}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>из 100</div>
                </div>
                <div className="w-px h-12 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                      style={{
                        background: GRADE_STYLE[evaluation.grade]?.bg,
                        color: GRADE_STYLE[evaluation.grade]?.text,
                        border: `1px solid ${GRADE_STYLE[evaluation.grade]?.border}`,
                      }}>
                      Grade {evaluation.grade}
                    </span>
                    {REC_STYLE[evaluation.recommendation] && (
                      <span className="text-sm font-medium" style={{ color: REC_STYLE[evaluation.recommendation].color }}>
                        {REC_STYLE[evaluation.recommendation].label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{evaluation.summary}</p>
                </div>
              </div>

              {/* AI usage */}
              <div className="rounded-xl p-4"
                style={{
                  background: evaluation.ai_usage_detected ? "rgba(251,191,36,0.07)" : "rgba(34,197,94,0.07)",
                  border: `1px solid ${evaluation.ai_usage_detected ? "rgba(251,191,36,0.2)" : "rgba(34,197,94,0.2)"}`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 shrink-0"
                    style={{ color: evaluation.ai_usage_detected ? "#fbbf24" : "#22c55e" }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {evaluation.ai_usage_detected
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    }
                  </svg>
                  <span className="text-sm font-medium"
                    style={{ color: evaluation.ai_usage_detected ? "#fbbf24" : "#22c55e" }}>
                    {evaluation.ai_usage_detected ? "Обнаружено возможное использование AI" : "Ответы выглядят органично"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {evaluation.ai_usage_summary || (evaluation.ai_usage_detected
                    ? `AI-флаг сработал на ${aiFlags} из ${totalAnswers} ответов`
                    : "Все ответы выглядят как написанные самим кандидатом")}
                </p>
              </div>

              {/* Strengths & Concerns */}
              <div className="grid grid-cols-2 gap-3">
                {evaluation.strengths?.length > 0 && (
                  <div className="rounded-xl p-4"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "#22c55e" }}>Сильные стороны</p>
                    <div className="space-y-1">
                      {evaluation.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs"
                          style={{ color: "rgba(255,255,255,0.65)" }}>
                          <span style={{ color: "#22c55e" }} className="mt-0.5">+</span>{s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {evaluation.concerns?.length > 0 && (
                  <div className="rounded-xl p-4"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "#f87171" }}>Опасения</p>
                    <div className="space-y-1">
                      {evaluation.concerns.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs"
                          style={{ color: "rgba(255,255,255,0.65)" }}>
                          <span style={{ color: "#f87171" }} className="mt-0.5">−</span>{c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>

          {/* Chat input */}
          {step === "chat" && !isFinal && (
            <div className="p-4 flex gap-3">
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
                }}
                placeholder="Введите ответ... (Enter — отправить, Shift+Enter — новая строка)"
                rows={3}
                disabled={sending}
                className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none resize-none disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.15)" }}
              />
              <button
                onClick={sendAnswer}
                disabled={!answer.trim() || sending}
                className="w-12 rounded-xl flex items-center justify-center transition disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          )}

          {/* Confirm footer */}
          {step === "confirm" && (
            <div className="p-4 flex gap-3">
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm transition hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                Отмена
              </button>
              <button onClick={startInterview}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 3H3v13l4 4h14V3z" />
                </svg>
                Начать интервью
              </button>
            </div>
          )}

          {/* Result footer */}
          {step === "result" && (
            <div className="p-4 flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--brand-core), var(--brand-light))" }}>
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
