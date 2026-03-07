"use client";

import { useState, useRef } from "react";

// ═══════════════════════════════════════════════════════
// RATE LIMITING
// Чат: 1 сеанс = 1 запрос из лимита, внутри сеанса cooldown нет
// Вставка текста: 1 вставка = 1 запрос, cooldown 30 сек
// ═══════════════════════════════════════════════════════

const DAILY_LIMIT = 5;          // сеансов в день
const PASTE_COOLDOWN_SEC = 30;  // cooldown только между вставками текста
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

function saveUsage(data: UsageData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Проверка лимита сеансов (для старта чата или вставки)
function checkSessionLimit(): { ok: boolean; reason?: string } {
  const usage = getUsage();
  if (usage.count >= DAILY_LIMIT)
    return { ok: false, reason: `Дневной лимит ${DAILY_LIMIT} сеансов исчерпан. Приходите завтра.` };
  return { ok: true };
}

// Проверка cooldown только для вставки текста
function checkPasteCooldown(): { ok: boolean; cooldownLeft?: number } {
  const usage = getUsage();
  const elapsed = (Date.now() - usage.lastPasteAt) / 1000;
  if (usage.lastPasteAt && elapsed < PASTE_COOLDOWN_SEC)
    return { ok: false, cooldownLeft: Math.ceil(PASTE_COOLDOWN_SEC - elapsed) };
  return { ok: true };
}

function incrementSession() {
  const usage = getUsage();
  saveUsage({ ...usage, count: usage.count + 1 });
}

function markPasteUsed() {
  const usage = getUsage();
  saveUsage({ ...usage, count: usage.count + 1, lastPasteAt: Date.now() });
}

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

type AIMode = "chat" | "paste";
type Message = { role: "user" | "ai"; text: string };

export type AIResult = {
  full_name?: string;
  headline?: string;
  city?: string;
  about?: string;
  experiences?: { company: string; position: string; start_date: string; end_date: string | null; description?: string }[];
  skills?: { name: string; level: string }[];
};

interface ResumeAIProps {
  onApply: (result: AIResult) => void;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════

const CHAT_SYSTEM = `Ты помощник по заполнению резюме. Твоя задача — ТОЛЬКО структурировать и оформить то, что говорит кандидат.
НЕ придумывай, НЕ приукрашивай, НЕ добавляй то чего не было сказано. Исправляй только орфографию.

Задавай вопросы по одному, по порядку:
1. Как вас зовут?
2. Какую должность ищете?
3. В каком городе?
4. Расскажите о себе в 2-3 предложениях
5. Расскажите об опыте работы (компания, должность, период). Спрашивай по каждому месту.
6. Когда закончите с опытом — спросите про навыки. Для каждого навыка уточни уровень: начальный, средний, продвинутый, эксперт.

Когда собрали все данные — скажи "Готово! Вот что я записал:" и верни JSON:
{"full_name":"...","headline":"...","city":"...","about":"...","experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD или null"}],"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}

Отвечай только на русском. Когда возвращаешь JSON — только JSON без лишнего текста после него.`;

const PASTE_SYSTEM = `Ты парсер резюме. Извлеки данные ТОЧНО как написано в тексте. НЕ меняй формулировки, НЕ добавляй то чего нет.

ПРАВИЛА ДАТ:
- Формат дат в резюме: "Январь 2026", "Июнь 2025", "Сентябрь 2019" и т.д.
- Преобразуй в YYYY-MM-DD: Январь=01, Февраль=02, Март=03, Апрель=04, Май=05, Июнь=06, Июль=07, Август=08, Сентябрь=09, Октябрь=10, Ноябрь=11, Декабрь=12
- "настоящее время" / "по настоящее время" = end_date: null
- Каждое место работы имеет СВОИ даты — не путай их между записями
- Читай даты слева от названия компании, они относятся именно к этой компании

ПРАВИЛА НАВЫКОВ:
- Возьми все навыки из раздела "Навыки"
- Языки тоже добавь как навыки с уровнем: A1/Начальный=beginner, B1/B2=intermediate, C1=advanced, C2/Родной=expert
- Уровень навыков если не указан = intermediate

ПРАВИЛА ПОЛЕЙ:
- full_name: имя из заголовка
- headline: первая/основная желаемая должность
- city: город проживания
- about: НЕ заполняй — оставь пустым ""

Верни ТОЛЬКО JSON без пояснений:
{"full_name":"...","headline":"...","city":"...","about":"","experiences":[{"company":"...","position":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD или null"}],"skills":[{"name":"...","level":"beginner|intermediate|advanced|expert"}]}`;

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

function hasData(r: AIResult) {
  return r.full_name || r.headline || r.city || r.about ||
    (r.experiences && r.experiences.length > 0) ||
    (r.skills && r.skills.length > 0);
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export function ResumeAI({ onApply, onClose }: ResumeAIProps) {
  const [mode, setMode] = useState<AIMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const usage = typeof window !== "undefined" ? getUsage() : { count: 0, date: "", lastPasteAt: 0 };
  const remaining = DAILY_LIMIT - usage.count;

  async function startChat() {
    const check = checkSessionLimit();
    if (!check.ok) { setError(check.reason ?? "Лимит исчерпан"); return; }
    setMode("chat");
    setLoading(true);
    incrementSession(); // считаем 1 сеанс при старте
    try {
      const res = await callClaude([{ role: "user", content: "Начни заполнение резюме" }], CHAT_SYSTEM);
      setMessages([{ role: "ai", text: res }]);
    } catch { setError("Ошибка подключения к ИИ"); }
    setLoading(false);
  }

  async function sendMessage() {
    // В чате нет cooldown — просто отправляем
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user" as "user" | "assistant",
        content: m.text,
      }));
      const res = await callClaude(history, CHAT_SYSTEM);
      setMessages(prev => [...prev, { role: "ai", text: res }]);
      const result = tryParseJSON(res);
      if (result && hasData(result)) setParsed(result);
    } catch { setError("Ошибка. Попробуйте ещё раз."); }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function parsePaste() {
    if (!pasteText.trim()) return;
    const sessionCheck = checkSessionLimit();
    if (!sessionCheck.ok) { setError(sessionCheck.reason ?? "Лимит исчерпан"); return; }
    const cooldownCheck = checkPasteCooldown();
    if (!cooldownCheck.ok) { startCooldownTimer(cooldownCheck.cooldownLeft!); return; }
    setLoading(true);
    setError(null);
    markPasteUsed(); // считаем 1 сеанс + обновляем lastPasteAt
    try {
      const res = await callClaude([{ role: "user", content: pasteText }], PASTE_SYSTEM);
      const result = tryParseJSON(res);
      if (result && hasData(result)) setParsed(result);
      else setError("Не удалось распознать данные. Попробуйте другой текст.");
    } catch { setError("Ошибка подключения к ИИ"); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0D0B1A", border: "1px solid rgba(196,173,255,0.2)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(92,46,204,0.4), rgba(124,74,232,0.4))", border: "1px solid rgba(196,173,255,0.2)" }}>
              <svg className="w-4 h-4" style={{ color: "#C4ADFF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">ИИ-помощник резюме</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Заполняет всё резюме целиком</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs px-2 py-1 rounded-lg"
              style={{ background: remaining <= 3 ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", color: remaining <= 3 ? "#f87171" : "rgba(255,255,255,0.4)", border: `1px solid ${remaining <= 3 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}` }}>
              {remaining}/{DAILY_LIMIT} сегодня
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cooldown banner */}
        {cooldown > 0 && (
          <div className="px-5 py-2.5 text-xs flex items-center gap-2"
            style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Следующий запрос через {cooldown} сек.
          </div>
        )}

        {/* Limit reached */}
        {remaining <= 0 && (
          <div className="px-5 py-2.5 text-xs flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                ИИ заполнит всё резюме — имя, опыт, навыки и «О себе».<br />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>Только структурирует ваши слова — без приукрашивания</span>
              </p>
              <button onClick={startChat} disabled={remaining <= 0}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01] disabled:opacity-50"
                style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.3)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(92,46,204,0.3)" }}>
                  <svg className="w-5 h-5" style={{ color: "#C4ADFF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Заполнить через чат</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>ИИ задаёт вопросы по всему резюме</div>
                </div>
              </button>

              <button onClick={() => setMode("paste")} disabled={remaining <= 0}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition hover:scale-[1.01] disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">Вставить старое резюме</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>ИИ разберёт текст по всем полям</div>
                </div>
              </button>
            </div>
          )}

          {/* Paste mode */}
          {mode === "paste" && !parsed && (
            <div className="p-5 space-y-4">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Вставьте текст резюме — ИИ заполнит все поля без изменений
              </p>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Вставьте текст резюме сюда..." rows={9}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
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
                <button onClick={() => setMode(null)} className="px-4 py-2.5 rounded-xl text-sm transition"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  Назад
                </button>
              </div>
            </div>
          )}

          {/* Chat mode */}
          {mode === "chat" && !parsed && (
            <div className="flex flex-col" style={{ height: "380px" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm"
                      style={{
                        background: m.role === "user" ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.9)",
                        borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        whiteSpace: "pre-wrap",
                      }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: "#C4ADFF", animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}

              <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ваш ответ..." disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
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
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.2)" }}>
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-400">Данные готовы</span>
              </div>

              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {parsed.full_name && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Имя: </span><span className="text-white">{parsed.full_name}</span></div>}
                {parsed.headline && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Должность: </span><span className="text-white">{parsed.headline}</span></div>}
                {parsed.city && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Город: </span><span className="text-white">{parsed.city}</span></div>}
                {parsed.about && <div><span style={{ color: "rgba(255,255,255,0.4)" }}>О себе: </span><span className="text-white">{parsed.about}</span></div>}
                {parsed.experiences?.map((e, i) => (
                  <div key={i}><span style={{ color: "rgba(255,255,255,0.4)" }}>Опыт {i+1}: </span><span className="text-white">{e.position} в {e.company}</span></div>
                ))}
                {parsed.skills && parsed.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsed.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: "rgba(92,46,204,0.2)", color: "#C4ADFF" }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Данные будут применены как есть — без изменений
              </p>

              <div className="flex gap-2">
                <button onClick={() => onApply(parsed)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
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