"use client";

import { useState, useRef } from "react";

// ═══════════════════════════════════════════════════════
// RATE LIMITING — только для вставки текста
// Чат: без лимита
// Вставка: 5 раз в день + cooldown 30 сек между вставками
// ═══════════════════════════════════════════════════════

const DAILY_LIMIT = 5;
const PASTE_COOLDOWN_SEC = 30;
const STORAGE_KEY = "ai_usage";

type UsageData = { count: number; date: string; lastPasteAt: number };

function getUsage(): UsageData {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: today, lastPasteAt: 0 };
    const data = JSON.parse(raw) as UsageData;
    if (data.date !== today) return { count: 0, date: today, lastPasteAt: 0 };
    return data;
  } catch { return { count: 0, date: new Date().toISOString().slice(0, 10), lastPasteAt: 0 }; }
}
function saveUsage(d: UsageData) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

function checkPasteLimit(): { ok: boolean; reason?: string } {
  const u = getUsage();
  if (u.count >= DAILY_LIMIT) return { ok: false, reason: `Лимит ${DAILY_LIMIT} вставок в день исчерпан. Приходите завтра.` };
  return { ok: true };
}
function checkPasteCooldown(): { ok: boolean; cooldownLeft?: number } {
  const u = getUsage();
  const elapsed = (Date.now() - u.lastPasteAt) / 1000;
  if (u.lastPasteAt && elapsed < PASTE_COOLDOWN_SEC) return { ok: false, cooldownLeft: Math.ceil(PASTE_COOLDOWN_SEC - elapsed) };
  return { ok: true };
}
function markPasteUsed() { const u = getUsage(); saveUsage({ ...u, count: u.count + 1, lastPasteAt: Date.now() }); }
function getPasteRemaining() { return DAILY_LIMIT - (typeof window !== "undefined" ? getUsage().count : 0); }

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

type Tab = "fill" | "analyze" | "salary" | "cover";
type FillMode = "chat" | "paste";
type Message = { role: "user" | "ai"; text: string };

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

const CHAT_SYSTEM = `Ты помощник по заполнению резюме. ТОЛЬКО структурируй то что говорит кандидат. НЕ придумывай, НЕ приукрашивай. Исправляй только орфографию.

Задавай вопросы строго по одному:
1. Как вас зовут?
2. Какую должность ищете?
3. В каком городе?
4. Расскажите о себе в 2-3 предложениях (кто вы, чем занимаетесь)
5. Опыт работы — по каждому месту: компания, должность, с какого по какой месяц и год
6. Навыки — перечислите, для каждого уточни уровень: начальный/средний/продвинутый/эксперт

Когда все данные собраны, скажи "Готово! Вот что я записал:" и сразу верни JSON:
{"full_name":"...","headline":"...","city":"...","about":"...","experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD или null"}],"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}

Отвечай только на русском.`;

const PASTE_SYSTEM = `Ты парсер резюме. Извлеки данные ТОЧНО как написано. НЕ меняй формулировки.

КРИТИЧНО — ПРАВИЛА ДАТ:
Месяцы: Январь=01, Февраль=02, Март=03, Апрель=04, Май=05, Июнь=06, Июль=07, Август=08, Сентябрь=09, Октябрь=10, Ноябрь=11, Декабрь=12
"настоящее время" / "по настоящее время" / "н.в." = end_date: null

ВАЖНО: каждая запись работы идёт СВЕРХУ ВНИЗ. Даты написаны СЛЕВА от названия компании и относятся ТОЛЬКО к ней.
Пример правильного чтения:
  "Январь 2026 — настоящее время  HamkorBank  Руководитель отдела" -> start_date: "2026-01-01", end_date: null
  "Июнь 2025 — Январь 2026  IPLUS  Руководитель департамента" -> start_date: "2025-06-01", end_date: "2026-01-01"
  "Август 2024 — Июнь 2025  CENTRAL DISTRIBUTOR  CCO" -> start_date: "2024-08-01", end_date: "2025-06-01"

НАВЫКИ: все из раздела "Навыки". Языки тоже: A1/Начальный=beginner, B1/B2=intermediate, C1=advanced, C2/Родной=expert. Без уровня = intermediate.

ПОЛЯ:
- full_name: имя из заголовка
- headline: первая/главная желаемая должность
- city: город проживания
- about: если есть раздел "О себе" или "Обо мне" — возьми текст оттуда. Если нет — составь 2 предложения из опыта кандидата (должность + ключевые навыки). НЕ оставляй пустым.

Верни ТОЛЬКО JSON без пояснений:
{"full_name":"...","headline":"...","city":"...","about":"...","experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":null}],"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}`;

function getAnalyzeSystem(data: ResumeData) {
  return `Ты карьерный консультант. Проанализируй резюме и дай конкретные рекомендации.

Резюме кандидата:
- Имя: ${data.full_name || "не указано"}
- Должность: ${data.headline || "не указана"}
- Город: ${data.city || "не указан"}
- О себе: ${data.about || "не заполнено"}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join(", ") : "не указан"}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : "не указаны"}

Дай анализ в таком формате:
✅ Сильные стороны (2-3 пункта)
⚠️ Что улучшить (2-3 конкретных пункта)
❌ Чего не хватает (2-3 пункта)
💡 Главный совет

Будь конкретным, не общим. Отвечай на русском. Не более 200 слов.`;
}

function getSalarySystem(data: ResumeData) {
  return `Ты эксперт по рынку труда Узбекистана. Оцени справедливую зарплату для кандидата.

Данные кандидата:
- Должность: ${data.headline || "не указана"}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join(", ") : "не указан"}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : "не указаны"}
- Город: ${data.city || "Ташкент"}

Дай оценку в формате:
💰 Минимум: X USD / Y млн сум
💰 Оптимально: X USD / Y млн сум
💰 Максимум: X USD / Y млн сум

Затем коротко объясни (2-3 предложения) на что влияет разброс и как добиться максимума.
Основывайся на реальном рынке Узбекистана 2024-2025. Отвечай на русском.`;
}

function getCoverSystem(data: ResumeData) {
  return `Ты помощник по написанию сопроводительных писем. Напиши письмо на основе ТОЛЬКО реального опыта кандидата — НЕ придумывай.

Резюме кандидата:
- Имя: ${data.full_name || "кандидат"}
- Должность: ${data.headline || ""}
- О себе: ${data.about || ""}
- Опыт: ${data.experiences?.length ? data.experiences.map(e => `${e.position} в ${e.company}`).join("; ") : ""}
- Навыки: ${data.skills?.length ? data.skills.map(s => s.name).join(", ") : ""}

Когда пользователь пришлёт текст вакансии — напиши сопроводительное письмо (150-200 слов):
1. Почему подходит именно на ЭТУ вакансию (основываясь на реальном опыте)
2. Конкретные достижения из резюме которые релевантны
3. Короткое завершение

Письмо должно быть живым и конкретным. Отвечай на русском.`;
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

const TABS: { id: Tab; label: string; icon: string; desc: string; color: string }[] = [
  { id: "fill",    label: "Заполнить", icon: "✍️", desc: "Заполнить резюме",        color: "#7C4AE8" },
  { id: "analyze", label: "Анализ",    icon: "🔍", desc: "Что улучшить",            color: "#06b6d4" },
  { id: "salary",  label: "Зарплата",  icon: "💰", desc: "Оценка по рынку УЗ",      color: "#f59e0b" },
  { id: "cover",   label: "Письмо",    icon: "✉️", desc: "Сопроводительное письмо", color: "#22c55e" },
];

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export function ResumeAI({ onApply, onClose, resumeData = {} }: ResumeAIProps) {
  const [tab, setTab] = useState<Tab>("fill");
  const [fillMode, setFillMode] = useState<FillMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [analysisResult, setAnalysisResult] = useState("");
  const [salaryResult, setSalaryResult] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [coverResult, setCoverResult] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pasteRemaining = getPasteRemaining();

  function startCooldownTimer(s: number) {
    setCooldown(s);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(p => { if (p <= 1) { clearInterval(cooldownRef.current!); return 0; } return p - 1; });
    }, 1000);
  }

  function switchTab(t: Tab) {
    setTab(t); setError(null); setMessages([]);
    setFillMode(null); setParsed(null);
    setAnalysisResult(""); setSalaryResult(""); setCoverResult("");
  }

  async function startChat() {
    setFillMode("chat");
    setLoading(true);
    try {
      const res = await callClaude([{ role: "user", content: "Начни" }], CHAT_SYSTEM);
      setMessages([{ role: "ai", text: res }]);
    } catch { setError("Ошибка подключения к ИИ"); }
    setLoading(false);
  }

  async function sendChatMsg() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const msgs: Message[] = [...messages, { role: "user", text: userMsg }];
    setMessages(msgs);
    setLoading(true);
    try {
      const history = msgs.map(m => ({
        role: m.role === "ai" ? "assistant" : "user" as "user" | "assistant",
        content: m.text,
      }));
      const res = await callClaude(history, CHAT_SYSTEM);
      setMessages(p => [...p, { role: "ai", text: res }]);
      const r = tryParseJSON(res);
      if (r && hasData(r)) setParsed(r);
    } catch { setError("Ошибка. Попробуйте ещё раз."); }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function parsePaste() {
    if (!pasteText.trim()) return;
    const limitCheck = checkPasteLimit();
    if (!limitCheck.ok) { setError(limitCheck.reason ?? "Лимит исчерпан"); return; }
    const cooldownCheck = checkPasteCooldown();
    if (!cooldownCheck.ok) { startCooldownTimer(cooldownCheck.cooldownLeft!); return; }
    setLoading(true);
    setError(null);
    markPasteUsed();
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
      const res = await callClaude([{ role: "user", content: "Проанализируй моё резюме" }], getAnalyzeSystem(resumeData));
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
      const res = await callClaude([{ role: "user", content: `Вот текст вакансии:\n\n${vacancyText}` }], getCoverSystem(resumeData));
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

        {/* Header */}
        <div className="px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: `${activeTab.color}25`, border: `1px solid ${activeTab.color}40` }}>
                {activeTab.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">ИИ-помощник</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{activeTab.desc}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tab === "fill" && fillMode === "paste" && (
                <div className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: pasteRemaining <= 2 ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                    color: pasteRemaining <= 2 ? "#f87171" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${pasteRemaining <= 2 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  вставок: {pasteRemaining}/{DAILY_LIMIT}
                </div>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className="flex-1 py-2 rounded-t-xl text-xs font-medium transition"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,0.06)" : "transparent",
                  color: tab === t.id ? "white" : "rgba(255,255,255,0.4)",
                  borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
                }}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cooldown banner */}
        {cooldown > 0 && (
          <div className="px-5 py-2 text-xs flex items-center gap-2"
            style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", borderTop: "1px solid rgba(251,191,36,0.15)" }}>
            ⏱ Следующая вставка через {cooldown} сек.
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* ══ FILL ══ */}
          {tab === "fill" && !fillMode && !parsed && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-center mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Структурирует только ваши слова — без приукрашивания
              </p>
              <button onClick={startChat}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01]"
                style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.3)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "rgba(92,46,204,0.25)" }}>💬</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Заполнить через чат</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>ИИ задаёт вопросы — без лимита</div>
                </div>
              </button>
              <button onClick={() => setFillMode("paste")} disabled={pasteRemaining <= 0}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01] disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)" }}>📄</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Вставить старое резюме</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    ИИ разберёт текст по всем полям · {pasteRemaining}/{DAILY_LIMIT} вставок сегодня
                  </div>
                </div>
              </button>
            </div>
          )}

          {tab === "fill" && fillMode === "paste" && !parsed && (
            <div className="p-5 space-y-3">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Вставьте текст резюме — ИИ заполнит все поля включая «О себе»
              </p>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Вставьте текст резюме сюда..." rows={9}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={parsePaste} disabled={loading || !pasteText.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  {loading ? <Spinner text="Анализирую..." /> : "Извлечь данные"}
                </button>
                <button onClick={() => setFillMode(null)} className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  Назад
                </button>
              </div>
            </div>
          )}

          {tab === "fill" && fillMode === "chat" && !parsed && (
            <ChatView messages={messages} loading={loading} error={error}
              input={input} onInput={setInput} onSend={sendChatMsg} bottomRef={bottomRef} />
          )}

          {tab === "fill" && parsed && (
            <div className="p-5 space-y-4">
              <span className="text-green-400 font-semibold text-sm">✓ Данные готовы</span>
              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {parsed.full_name && <Row label="Имя" value={parsed.full_name} />}
                {parsed.headline && <Row label="Должность" value={parsed.headline} />}
                {parsed.city && <Row label="Город" value={parsed.city} />}
                {parsed.about && <Row label="О себе" value={parsed.about} />}
                {parsed.experiences?.map((e, i) => (
                  <Row key={i} label={`Опыт ${i + 1}`} value={`${e.position} в ${e.company}`} />
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
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Данные будут применены как есть</p>
              <div className="flex gap-2">
                <button onClick={() => onApply(parsed)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>Применить</button>
                <button onClick={() => { setParsed(null); setFillMode(null); }}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Заново</button>
              </div>
            </div>
          )}

          {/* ══ ANALYZE ══ */}
          {tab === "analyze" && (
            <div className="p-5 space-y-4">
              {!analysisResult ? (
                <>
                  <div className="rounded-xl p-4 text-sm space-y-2"
                    style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <p className="font-semibold" style={{ color: "#22d3ee" }}>Что анализирует ИИ:</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Полноту заполнения резюме</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Сильные и слабые стороны</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Чего не хватает для должности</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Конкретные советы по улучшению</p>
                  </div>
                  {!resumeData.headline && !resumeData.experiences?.length && (
                    <p className="text-xs text-amber-400">⚠️ Сначала заполните резюме — анализ будет точнее</p>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runAnalysis} disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)" }}>
                    {loading ? <Spinner text="Анализирую резюме..." /> : "🔍 Проанализировать резюме"}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                    {analysisResult}
                  </div>
                  <button onClick={() => setAnalysisResult("")} className="w-full py-2.5 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                    Обновить анализ
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══ SALARY ══ */}
          {tab === "salary" && (
            <div className="p-5 space-y-4">
              {!salaryResult ? (
                <>
                  <div className="rounded-xl p-4 text-sm space-y-2"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <p className="font-semibold" style={{ color: "#fbbf24" }}>Оценка по рынку Узбекистана:</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Диапазон зарплат для вашей должности</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Сравнение с уровнем опыта</p>
                    <p style={{ color: "rgba(255,255,255,0.6)" }}>• Как получить максимум</p>
                  </div>
                  {!resumeData.headline && (
                    <p className="text-xs text-amber-400">⚠️ Укажите желаемую должность для точной оценки</p>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runSalary} disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                    {loading ? <Spinner text="Анализирую рынок..." /> : "💰 Оценить зарплату"}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                    {salaryResult}
                  </div>
                  <button onClick={() => setSalaryResult("")} className="w-full py-2.5 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                    Пересчитать
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══ COVER LETTER ══ */}
          {tab === "cover" && (
            <div className="p-5 space-y-4">
              {!coverResult ? (
                <>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Вставьте текст вакансии — ИИ напишет письмо на основе вашего реального опыта
                  </p>
                  <textarea value={vacancyText} onChange={e => setVacancyText(e.target.value)}
                    placeholder="Вставьте описание вакансии сюда..." rows={7}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
                  {!resumeData.experiences?.length && (
                    <p className="text-xs text-amber-400">⚠️ Заполните опыт работы для более точного письма</p>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button onClick={runCoverLetter} disabled={loading || !vacancyText.trim()}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}>
                    {loading ? <Spinner text="Пишу письмо..." /> : "✉️ Написать письмо"}
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
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}>
                      📋 Скопировать
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

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function ChatView({ messages, loading, error, input, onInput, onSend, bottomRef }: {
  messages: Message[];
  loading: boolean;
  error: string | null;
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col" style={{ height: "380px" }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.9)",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "#C4ADFF", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400 px-1">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <input value={input} onChange={e => onInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
          placeholder="Ваш ответ..." disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
        <button onClick={onSend} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}: </span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// API CALL
// ═══════════════════════════════════════════════════════

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