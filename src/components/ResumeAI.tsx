"use client";

import { useState } from "react";

// ═══════════════════════════════════════════════════════
// RATE LIMITING — только для вставки резюме
// 5 вставок в день + cooldown 30 сек
// ═══════════════════════════════════════════════════════

const PASTE_LIMIT = 5;
const PASTE_COOLDOWN_SEC = 30;
const STORAGE_KEY = "ai_paste_usage";

type UsageData = { count: number; date: string; lastAt: number };

function getUsage(): UsageData {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: today, lastAt: 0 };
    const d = JSON.parse(raw) as UsageData;
    if (d.date !== today) return { count: 0, date: today, lastAt: 0 };
    return d;
  } catch { return { count: 0, date: new Date().toISOString().slice(0, 10), lastAt: 0 }; }
}
function saveUsage(d: UsageData) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
function checkPasteLimit(): { ok: boolean; reason?: string } {
  const u = getUsage();
  if (u.count >= PASTE_LIMIT) return { ok: false, reason: `Лимит ${PASTE_LIMIT} вставок в день исчерпан. Приходите завтра.` };
  return { ok: true };
}
function checkCooldown(): { ok: boolean; left?: number } {
  const u = getUsage();
  const elapsed = (Date.now() - u.lastAt) / 1000;
  if (u.lastAt && elapsed < PASTE_COOLDOWN_SEC) return { ok: false, left: Math.ceil(PASTE_COOLDOWN_SEC - elapsed) };
  return { ok: true };
}
function markUsed() { const u = getUsage(); saveUsage({ ...u, count: u.count + 1, lastAt: Date.now() }); }
function getRemaining() { return PASTE_LIMIT - (typeof window !== "undefined" ? getUsage().count : 0); }

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

type Tab = "paste" | "analyze" | "salary" | "cover";

export type AIResult = {
  full_name?: string;
  headline?: string;
  city?: string;
  about?: string;
  experiences?: { company: string; position: string; start_date: string; end_date: string | null }[];
  skills?: { name: string; level: string }[];
};

export interface ResumeData {
  full_name?: string;
  headline?: string;
  city?: string;
  about?: string;
  experiences?: { company: string; position: string; start_date: string | null; end_date: string | null }[];
  skills?: { name: string; level: string }[];
}

interface ResumeAIProps {
  onApply: (result: AIResult) => void;
  onClose: () => void;
  resumeData?: ResumeData;
}

// ═══════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════

const PASTE_SYSTEM = `Ты парсер резюме. Резюме может быть на русском, узбекском или английском языке — читай на любом, отвечай данными в JSON.

КРИТИЧНО — ПРАВИЛА ДАТ:
Месяцы RU: Январь=01, Февраль=02, Март=03, Апрель=04, Май=05, Июнь=06, Июль=07, Август=08, Сентябрь=09, Октябрь=10, Ноябрь=11, Декабрь=12
Месяцы UZ: Yanvar=01, Fevral=02, Mart=03, Aprel=04, May=05, Iyun=06, Iyul=07, Avgust=08, Sentyabr=09, Oktyabr=10, Noyabr=11, Dekabr=12
"настоящее время" / "hozirgi vaqt" / "present" / "н.в." = end_date: null

Каждая запись работы идёт СВЕРХУ ВНИЗ. Даты написаны СЛЕВА от названия компании и относятся ТОЛЬКО к ней.
Пример:
  "Январь 2026 — настоящее время  HamkorBank  Руководитель отдела" -> start: "2026-01-01", end: null
  "Июнь 2025 — Январь 2026  IPLUS  Руководитель департамента" -> start: "2025-06-01", end: "2026-01-01"
  "Август 2024 — Июнь 2025  CENTRAL DISTRIBUTOR  CCO" -> start: "2024-08-01", end: "2025-06-01"

НАВЫКИ: все из раздела "Навыки" / "Ko'nikmalar" / "Skills".
Языки: A1/Beginner/Boshlang'ich=beginner, B1/B2/Intermediate/O'rta=intermediate, C1/Advanced/Yuqori=advanced, C2/Native/Ona tili/Родной=expert. Без уровня = intermediate.

ПОЛЯ (результат всегда на русском языке):
- full_name: имя из заголовка
- headline: главная желаемая должность (переведи на русский если на узбекском/английском)
- city: город проживания
- about: если есть раздел "О себе"/"Men haqimda"/"About" — возьми текст. Если нет — составь 2 предложения из опыта. НЕ оставляй пустым.

Верни ТОЛЬКО JSON без пояснений:
{"full_name":"...","headline":"...","city":"...","about":"...","experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":null}],"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}`;

function getAnalyzeSystem(data: ResumeData) {
  return `Ты карьерный консультант. Проанализируй резюме кандидата.

Данные:
- Имя: ${data.full_name || "не указано"}
- Должность: ${data.headline || "не указана"}
- Город: ${data.city || "не указан"}
- О себе: ${data.about || "не заполнено"}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join(", ") : "не указан"}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : "не указаны"}

Используй ТОЛЬКО обычный текст — без markdown, без звёздочек, без решёток, без эмодзи.
Ответ строго в таком формате:

Сильные стороны:
— ...
— ...

Что улучшить:
— ...
— ...

Чего не хватает:
— ...
— ...

Главный совет:
...

Будь конкретным. Не более 200 слов. Отвечай на русском.`;
}

function getSalarySystem(data: ResumeData) {
  return `Ты эксперт по рынку труда Узбекистана.

Данные кандидата:
- Должность: ${data.headline || "не указана"}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join(", ") : "не указан"}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : "не указаны"}
- Город: ${data.city || "Ташкент"}

Используй ТОЛЬКО обычный текст — без markdown, без звёздочек, без решёток, без эмодзи.
Ответ строго в таком формате:

Минимум: X USD / Y млн сум
Оптимально: X USD / Y млн сум
Максимум: X USD / Y млн сум

Объяснение:
...2-3 предложения на что влияет разброс и как добиться максимума...

Рынок Узбекистана 2024-2025. Отвечай на русском.`;
}

function getCoverSystem(data: ResumeData) {
  return `Ты помощник по написанию сопроводительных писем. Используй ТОЛЬКО реальный опыт кандидата — НЕ придумывай.

Резюме:
- Имя: ${data.full_name || "кандидат"}
- Должность: ${data.headline || ""}
- О себе: ${data.about || ""}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join("; ") : ""}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : ""}

Используй ТОЛЬКО обычный текст — без markdown, без звёздочек, без решёток, без эмодзи, без нумерации пунктов.
Напиши письмо 150-200 слов: почему подхожу на эту вакансию, конкретные достижения, завершение.
Отвечай на русском.`;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function tryParseJSON(text: string): AIResult | null {
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}
function hasData(r: AIResult) {
  return r.full_name || r.headline || r.city || r.about ||
    (r.experiences?.length ?? 0) > 0 || (r.skills?.length ?? 0) > 0;
}

// ═══════════════════════════════════════════════════════
// TAB ICONS (SVG)
// ═══════════════════════════════════════════════════════

function TabIcon({ id, size = 14 }: { id: Tab; size?: number }) {
  const s = { width: size, height: size };
  if (id === "paste") return (
    <svg style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  if (id === "analyze") return (
    <svg style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  if (id === "salary") return (
    <svg style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return (
    <svg style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

const TABS: { id: Tab; label: string; desc: string; color: string }[] = [
  { id: "paste",   label: "Импорт",   desc: "Вставить из старого резюме", color: "#7C4AE8" },
  { id: "analyze", label: "Анализ",   desc: "Что улучшить",               color: "#06b6d4" },
  { id: "salary",  label: "Зарплата", desc: "Оценка по рынку УЗ",         color: "#f59e0b" },
  { id: "cover",   label: "Письмо",   desc: "Сопроводительное письмо",    color: "#22c55e" },
];

// ═══════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export function ResumeAI({ onApply, onClose, resumeData = {} }: ResumeAIProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = { current: null as ReturnType<typeof setInterval> | null };

  // Paste tab
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<AIResult | null>(null);

  // Analyze / Salary / Cover
  const [analysisResult, setAnalysisResult] = useState("");
  const [salaryResult, setSalaryResult] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [coverResult, setCoverResult] = useState("");

  const remaining = getRemaining();

  function startCooldown(s: number) {
    setCooldown(s);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(p => { if (p <= 1) { clearInterval(cooldownRef.current!); return 0; } return p - 1; });
    }, 1000);
  }

  function switchTab(t: Tab) {
    setTab(t); setError(null);
    setParsed(null); setAnalysisResult(""); setSalaryResult(""); setCoverResult("");
  }

  async function parsePaste() {
    if (!pasteText.trim()) return;
    const lim = checkPasteLimit(); if (!lim.ok) { setError(lim.reason ?? "Лимит исчерпан"); return; }
    const cd = checkCooldown(); if (!cd.ok) { startCooldown(cd.left!); return; }
    setLoading(true); setError(null); markUsed();
    try {
      const res = await callClaude([{ role: "user", content: pasteText }], PASTE_SYSTEM);
      const r = tryParseJSON(res);
      if (r && hasData(r)) setParsed(r);
      else setError("Не удалось распознать данные. Попробуйте другой текст.");
    } catch { setError("Ошибка подключения к ИИ"); }
    setLoading(false);
  }

  async function runAnalysis() {
    setLoading(true); setError(null);
    try {
      const res = await callClaude([{ role: "user", content: "Проанализируй резюме" }], getAnalyzeSystem(resumeData));
      setAnalysisResult(res);
    } catch { setError("Ошибка подключения"); }
    setLoading(false);
  }

  async function runSalary() {
    setLoading(true); setError(null);
    try {
      const res = await callClaude([{ role: "user", content: "Оцени зарплату" }], getSalarySystem(resumeData));
      setSalaryResult(res);
    } catch { setError("Ошибка подключения"); }
    setLoading(false);
  }

  async function runCoverLetter() {
    if (!vacancyText.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await callClaude([{ role: "user", content: `Вакансия:\n\n${vacancyText}` }], getCoverSystem(resumeData));
      setCoverResult(res);
    } catch { setError("Ошибка подключения"); }
    setLoading(false);
  }

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0D0B1A", border: "1px solid rgba(196,173,255,0.2)", maxHeight: "92vh" }}>

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${activeTab.color}20`, border: `1px solid ${activeTab.color}35` }}>
                <span style={{ color: activeTab.color }}><TabIcon id={tab} size={16} /></span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">ИИ-помощник</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{activeTab.desc}</div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className="flex-1 py-2 rounded-t-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,0.06)" : "transparent",
                  color: tab === t.id ? "white" : "rgba(255,255,255,0.4)",
                  borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
                }}>
                <span style={{ color: tab === t.id ? t.color : "currentColor" }}>
                  <TabIcon id={t.id} size={13} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cooldown banner */}
        {cooldown > 0 && (
          <div className="px-5 py-2 text-xs flex items-center gap-2"
            style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", borderTop: "1px solid rgba(251,191,36,0.15)" }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Следующая вставка через {cooldown} сек.
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* ══ PASTE TAB ══ */}
          {tab === "paste" && !parsed && (
            <div className="p-5 space-y-3">
              <div className="rounded-xl p-3 text-xs flex items-start gap-2.5"
                style={{ background: "rgba(124,74,232,0.08)", border: "1px solid rgba(124,74,232,0.2)" }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#C4ADFF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Вставьте текст старого резюме — ИИ извлечёт все данные и заполнит профиль.
                  Поддерживаются резюме на <span className="text-white">русском, узбекском и английском</span> языках.
                </span>
              </div>

              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Вставьте текст резюме сюда..." rows={10}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {remaining}/{PASTE_LIMIT} вставок сегодня
                </span>
                <button onClick={parsePaste} disabled={loading || !pasteText.trim() || remaining <= 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  {loading ? <Spinner text="Анализирую..." /> : "Извлечь данные"}
                </button>
              </div>
            </div>
          )}

          {/* PASTE result */}
          {tab === "paste" && parsed && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-400">Данные извлечены</span>
              </div>

              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {parsed.full_name && <PRow label="Имя" value={parsed.full_name} />}
                {parsed.headline && <PRow label="Должность" value={parsed.headline} />}
                {parsed.city && <PRow label="Город" value={parsed.city} />}
                {parsed.about && <PRow label="О себе" value={parsed.about} />}
                {parsed.experiences?.map((e, i) => (
                  <PRow key={i} label={`Опыт ${i + 1}`} value={`${e.position} — ${e.company}`} />
                ))}
                {parsed.skills && parsed.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsed.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: "rgba(92,46,204,0.2)", color: "#C4ADFF" }}>{s.name}</span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Данные заменят текущие поля профиля
              </p>

              <div className="flex gap-2">
                <button onClick={() => onApply(parsed)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  Применить к профилю
                </button>
                <button onClick={() => { setParsed(null); setPasteText(""); }}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  Заново
                </button>
              </div>
            </div>
          )}

          {/* ══ ANALYZE TAB ══ */}
          {tab === "analyze" && (
            <div className="p-5 space-y-4">
              {!analysisResult ? (
                <>
                  <div className="rounded-xl p-4 text-sm space-y-2"
                    style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.18)" }}>
                    <p className="font-medium" style={{ color: "#67e8f9" }}>ИИ проверит:</p>
                    {["Полноту заполнения резюме", "Сильные и слабые стороны", "Чего не хватает для должности", "Конкретные советы по улучшению"].map(t => (
                      <div key={t} className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <svg className="w-3 h-3 shrink-0" style={{ color: "#06b6d4" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {t}
                      </div>
                    ))}
                  </div>
                  {!resumeData.headline && !resumeData.experiences?.length && (
                    <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Сначала заполните резюме — анализ будет точнее
                    </div>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runAnalysis} disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)" }}>
                    {loading ? <Spinner text="Анализирую резюме..." /> : (
                      <>
                        <TabIcon id="analyze" size={16} />
                        Проанализировать резюме
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                    {analysisResult}
                  </div>
                  <button onClick={() => setAnalysisResult("")}
                    className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Обновить анализ
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══ SALARY TAB ══ */}
          {tab === "salary" && (
            <div className="p-5 space-y-4">
              {!salaryResult ? (
                <>
                  <div className="rounded-xl p-4 text-sm space-y-2"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}>
                    <p className="font-medium" style={{ color: "#fcd34d" }}>Оценка по рынку Узбекистана:</p>
                    {["Диапазон зарплат для вашей должности", "Учитывает опыт и навыки", "Как получить максимум"].map(t => (
                      <div key={t} className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <svg className="w-3 h-3 shrink-0" style={{ color: "#f59e0b" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {t}
                      </div>
                    ))}
                  </div>
                  {!resumeData.headline && (
                    <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Укажите желаемую должность для точной оценки
                    </div>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runSalary} disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                    {loading ? <Spinner text="Анализирую рынок..." /> : (
                      <>
                        <TabIcon id="salary" size={16} />
                        Оценить зарплату
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                    {salaryResult}
                  </div>
                  <button onClick={() => setSalaryResult("")}
                    className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Пересчитать
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══ COVER LETTER TAB ══ */}
          {tab === "cover" && (
            <div className="p-5 space-y-4">
              {!coverResult ? (
                <>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Вставьте описание вакансии — ИИ напишет письмо на основе вашего реального опыта
                  </p>
                  <textarea value={vacancyText} onChange={e => setVacancyText(e.target.value)}
                    placeholder="Вставьте описание вакансии сюда..." rows={7}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
                  {!resumeData.experiences?.length && (
                    <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Заполните опыт работы для более точного письма
                    </div>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runCoverLetter} disabled={loading || !vacancyText.trim()}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}>
                    {loading ? <Spinner text="Пишу письмо..." /> : (
                      <>
                        <TabIcon id="cover" size={16} />
                        Написать письмо
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                    {coverResult}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(coverResult)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Скопировать
                    </button>
                    <button onClick={() => { setCoverResult(""); setVacancyText(""); }}
                      className="px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                      Заново
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}: </span>
      <span className="text-white">{value}</span>
    </div>
  );
}

async function callClaude(
  messages: { role: "user" | "assistant"; content: string }[],
  system: string
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, max_tokens: 1500 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text ?? "";
}