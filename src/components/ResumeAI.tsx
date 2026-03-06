"use client";

import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════

const DAILY_LIMIT = 10;        // максимум запросов в день
const COOLDOWN_SEC = 30;       // секунд между запросами
const STORAGE_KEY = "ai_usage";

type UsageData = {
  count: number;       // сколько запросов сегодня
  date: string;        // YYYY-MM-DD
  lastAt: number;      // timestamp последнего запроса
};

function getUsage(): UsageData {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: today, lastAt: 0 };
    const data = JSON.parse(raw) as UsageData;
    // Сброс если новый день
    if (data.date !== today) return { count: 0, date: today, lastAt: 0 };
    return data;
  } catch { return { count: 0, date: new Date().toISOString().slice(0, 10), lastAt: 0 }; }
}

function saveUsage(data: UsageData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function checkLimit(): { ok: boolean; reason?: string; cooldownLeft?: number } {
  const usage = getUsage();
  if (usage.count >= DAILY_LIMIT) {
    return { ok: false, reason: `Дневной лимит ${DAILY_LIMIT} запросов исчерпан. Приходите завтра.` };
  }
  const elapsed = (Date.now() - usage.lastAt) / 1000;
  if (usage.lastAt && elapsed < COOLDOWN_SEC) {
    return { ok: false, reason: "cooldown", cooldownLeft: Math.ceil(COOLDOWN_SEC - elapsed) };
  }
  return { ok: true };
}

function incrementUsage() {
  const usage = getUsage();
  saveUsage({ ...usage, count: usage.count + 1, lastAt: Date.now() });
}

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

type AIMode = "chat" | "paste";

type Message = {
  role: "user" | "ai";
  text: string;
};

type AISection = "basic" | "experience" | "skills";

type AIResult = {
  // basic
  full_name?: string;
  headline?: string;
  city?: string;
  about?: string;
  // experience items
  experiences?: { company: string; position: string; start_date: string; end_date: string | null; description?: string }[];
  // skills
  skills?: { name: string; level: string }[];
};

interface ResumeAIProps {
  section: AISection;
  onApply: (result: AIResult) => void;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════
// SYSTEM PROMPTS — строго структурирует, не приукрашивает
// ═══════════════════════════════════════════════════════

const SYSTEM_PROMPTS: Record<AISection, string> = {
  basic: `Ты помощник по заполнению резюме. Твоя задача — ТОЛЬКО структурировать и оформить то, что говорит кандидат. 
НЕ придумывай, НЕ приукрашивай, НЕ добавляй то чего не было сказано.
Исправляй только орфографию и пунктуацию.

Задавай уточняющие вопросы по одному:
1. Как вас зовут?
2. Какую должность ищете?
3. В каком городе?
4. Расскажите о себе в 2-3 предложениях (опыт, чем занимаетесь)

Когда получишь все данные, верни JSON:
{"full_name":"...","headline":"...","city":"...","about":"..."}

Отвечай только на русском. Не добавляй комментарии вне JSON когда возвращаешь результат.`,

  experience: `Ты помощник по заполнению опыта работы в резюме. ТОЛЬКО структурируй то что говорит кандидат.
НЕ придумывай обязанности, НЕ улучшай формулировки, НЕ добавляй то чего не было.
Исправляй только орфографию.

Задавай вопросы по каждому месту работы:
1. Где работали? (название компании)
2. Какая должность?
3. С какого по какой период? (месяц и год)
4. Есть ещё места работы?

Когда получишь все данные, верни JSON массив:
{"experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD или null","description":"..."}]}

Отвечай только на русском.`,

  skills: `Ты помощник по заполнению навыков в резюме. ТОЛЬКО структурируй то что называет кандидат.
НЕ добавляй навыки которые не были названы. НЕ придумывай уровни — спрашивай.

Уровни: beginner (начальный), intermediate (средний), advanced (продвинутый), expert (эксперт)

Спроси:
1. Перечислите ваши навыки
2. Для каждого навыка уточни уровень

Когда получишь данные, верни JSON:
{"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}

Отвечай только на русском.`,
};

const PASTE_PROMPTS: Record<AISection, string> = {
  basic: `Извлеки из текста резюме только: имя, желаемую должность, город, краткое описание о себе (как написано, без улучшений).
Верни JSON: {"full_name":"...","headline":"...","city":"...","about":"..."}
Если какого-то поля нет в тексте — оставь пустую строку. Только JSON, без комментариев.`,

  experience: `Извлеки из текста все места работы: компания, должность, даты начала и окончания.
Даты в формате YYYY-MM-DD. Если работает сейчас — end_date: null.
Верни JSON: {"experiences":[{"company":"...","position":"...","start_date":"...","end_date":null}]}
Только JSON, без комментариев. Не добавляй то чего нет в тексте.`,

  skills: `Извлеки из текста все навыки. Для уровня используй: beginner, intermediate, advanced, expert.
Если уровень не указан — используй intermediate.
Верни JSON: {"skills":[{"name":"...","level":"..."}]}
Только JSON, без комментариев.`,
};

const SECTION_LABELS: Record<AISection, string> = {
  basic: "основную информацию",
  experience: "опыт работы",
  skills: "навыки",
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function tryParseJSON(text: string): AIResult | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export function ResumeAI({ section, onApply, onClose }: ResumeAIProps) {
  const [mode, setMode] = useState<AIMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown timer
  function startCooldownTimer(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // Usage info
  const usage = typeof window !== "undefined" ? getUsage() : { count: 0, date: "", lastAt: 0 };
  const remaining = DAILY_LIMIT - usage.count;

  // Start chat mode — AI asks first question
  async function startChat() {
    const check = checkLimit();
    if (!check.ok) {
      if (check.cooldownLeft) { startCooldownTimer(check.cooldownLeft); }
      else setError(check.reason ?? "Лимит исчерпан");
      return;
    }
    setMode("chat");
    setLoading(true);
    try {
      incrementUsage();
      const res = await callClaude([
        { role: "user", content: "Начни" }
      ], SYSTEM_PROMPTS[section]);
      setMessages([{ role: "ai", text: res }]);
    } catch {
      setError("Ошибка подключения к ИИ");
    }
    setLoading(false);
  }

  // Send message in chat
  async function sendMessage() {
    if (!input.trim() || loading) return;
    const check = checkLimit();
    if (!check.ok) {
      if (check.cooldownLeft) { startCooldownTimer(check.cooldownLeft); }
      else setError(check.reason ?? "Лимит исчерпан");
      return;
    }
    const userMsg = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    incrementUsage();
    try {
      const history = newMessages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user" as "user" | "assistant",
        content: m.text,
      }));
      const res = await callClaude(history, SYSTEM_PROMPTS[section]);
      setMessages(prev => [...prev, { role: "ai", text: res }]);
      const result = tryParseJSON(res);
      if (result && hasData(result)) { setParsed(result); }
    } catch {
      setError("Ошибка. Попробуйте ещё раз.");
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // Parse pasted text
  async function parsePaste() {
    if (!pasteText.trim()) return;
    const check = checkLimit();
    if (!check.ok) {
      if (check.cooldownLeft) { startCooldownTimer(check.cooldownLeft); }
      else setError(check.reason ?? "Лимит исчерпан");
      return;
    }
    setLoading(true);
    setError(null);
    incrementUsage();
    try {
      const res = await callClaude([
        { role: "user", content: pasteText }
      ], PASTE_PROMPTS[section]);
      const result = tryParseJSON(res);
      if (result && hasData(result)) {
        setParsed(result);
      } else {
        setError("Не удалось распознать данные. Попробуйте другой текст.");
      }
    } catch {
      setError("Ошибка подключения к ИИ");
    }
    setLoading(false);
  }

  function hasData(r: AIResult) {
    return r.full_name || r.headline || r.city || r.about ||
      (r.experiences && r.experiences.length > 0) ||
      (r.skills && r.skills.length > 0);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#0D0B1A", border: "1px solid rgba(196,173,255,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(92,46,204,0.4), rgba(124,74,232,0.4))", border: "1px solid rgba(196,173,255,0.2)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">ИИ-помощник</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Заполнение: {SECTION_LABELS[section]}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Usage counter */}
            <div className="text-xs px-2 py-1 rounded-lg"
              style={{ background: remaining <= 3 ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", color: remaining <= 3 ? "#f87171" : "rgba(255,255,255,0.4)", border: `1px solid ${remaining <= 3 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}` }}>
              {remaining}/{DAILY_LIMIT} сегодня
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cooldown banner */}
        {cooldown > 0 && (
          <div className="px-5 py-3 text-sm flex items-center gap-2"
            style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Следующий запрос через {cooldown} сек.
          </div>
        )}

        {/* Limit reached */}
        {remaining <= 0 && (
          <div className="px-5 py-3 text-sm flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Дневной лимит исчерпан. Приходите завтра.
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Mode selection */}
          {!mode && !parsed && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-center mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
                ИИ структурирует только то что вы скажете — без приукрашивания
              </p>
              <button onClick={startChat}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01]"
                style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.3)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(92,46,204,0.3)" }}>
                  <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Рассказать голосом / текстом</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>ИИ задаёт вопросы и заполняет поля</div>
                </div>
              </button>

              <button onClick={() => setMode("paste")}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Вставить старое резюме</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>ИИ разберёт текст по полям</div>
                </div>
              </button>
            </div>
          )}

          {/* Paste mode */}
          {mode === "paste" && !parsed && (
            <div className="p-5 space-y-4">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Вставьте текст резюме — ИИ извлечёт данные без изменений
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Вставьте текст резюме сюда..."
                rows={8}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={parsePaste} disabled={loading || !pasteText.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Анализирую...
                    </span>
                  ) : "Извлечь данные"}
                </button>
                <button onClick={() => setMode(null)}
                  className="px-4 py-2.5 rounded-xl text-sm transition"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  Назад
                </button>
              </div>
            </div>
          )}

          {/* Chat mode */}
          {mode === "chat" && !parsed && (
            <div className="flex flex-col" style={{ height: "360px" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm`}
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
                            style={{ background: "var(--lavender)", animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {error && <p className="px-4 text-xs text-red-400">{error}</p>}

              <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ваш ответ..."
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Result preview */}
          {parsed && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.2)" }}>
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-400">Данные извлечены</span>
              </div>

              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {parsed.full_name && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Имя: </span><span className="text-white">{parsed.full_name}</span></div>}
                {parsed.headline && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Должность: </span><span className="text-white">{parsed.headline}</span></div>}
                {parsed.city && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Город: </span><span className="text-white">{parsed.city}</span></div>}
                {parsed.about && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>О себе: </span><span className="text-white">{parsed.about}</span></div>}
                {parsed.experiences?.map((e, i) => (
                  <div key={i}><span style={{ color: "rgba(255,255,255,0.4)" }}>Опыт {i + 1}: </span><span className="text-white">{e.position} в {e.company}</span></div>
                ))}
                {parsed.skills?.map((s, i) => (
                  <span key={i} className="inline-block mr-2 px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)" }}>
                    {s.name}
                  </span>
                ))}
              </div>

              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Данные будут заполнены как есть — без изменений
              </p>

              <div className="flex gap-2">
                <button onClick={() => onApply(parsed)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                  style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)" }}>
                  Применить
                </button>
                <button onClick={() => { setParsed(null); setMode(null); }}
                  className="px-4 py-2.5 rounded-xl text-sm transition"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  Заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// API CALL — через безопасный server-side route
// ═══════════════════════════════════════════════════════

async function callClaude(
  messages: { role: "user" | "assistant"; content: string }[],
  system: string
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, max_tokens: 1000 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text ?? "";
}