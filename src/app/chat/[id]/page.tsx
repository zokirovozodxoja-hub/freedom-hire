"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherPersonName, setOtherPersonName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [appStatus, setAppStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const receiverIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initChat().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [applicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initChat() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/auth"); return; }

    const userId = userData.user.id;
    setCurrentUserId(userId);

    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, candidate_id, job_id, status, jobs(title, company_id, companies(name, owner_id))")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !app) {
      setError("Чат не найден. Возможно, отклик был удалён.");
      setLoading(false);
      return;
    }

    const job = app.jobs as any;
    setJobTitle(job?.title ?? "");
    setAppStatus(app.status ?? "");

    if (app.candidate_id === userId) {
      setOtherPersonName(job?.companies?.name ?? "Работодатель");
      receiverIdRef.current = job?.companies?.owner_id ?? null;
    } else {
      const { data: cp } = await supabase
        .from("profiles").select("full_name, email")
        .eq("id", app.candidate_id).maybeSingle();
      setOtherPersonName(cp?.full_name ?? cp?.email ?? "Кандидат");
      receiverIdRef.current = app.candidate_id;
    }

    await loadMessages(supabase);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);

    const channel = supabase
      .channel(`chat-${applicationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `application_id=eq.${applicationId}`,
      }, async () => {
        await loadMessages(supabase);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  async function loadMessages(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, message, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSending(false); return; }

    await supabase.from("messages").insert({
      application_id: applicationId,
      sender_id: userData.user.id,
      receiver_id: receiverIdRef.current,
      message: text,
    });

    await loadMessages(supabase);
    setSending(false);
    inputRef.current?.focus();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  const STATUS_LABELS: Record<string, { label: string; color: string; border: string; bg: string }> = {
    applied:     { label: "Отклик отправлен",   color: "#C4ADFF", border: "rgba(196,173,255,0.3)", bg: "rgba(196,173,255,0.1)" },
    in_progress: { label: "Рассматривается",    color: "#fbbf24", border: "rgba(251,191,36,0.3)",  bg: "rgba(251,191,36,0.1)"  },
    invited:     { label: "Приглашён на интервью", color: "#34d399", border: "rgba(52,211,153,0.3)", bg: "rgba(52,211,153,0.1)" },
    rejected:    { label: "Отказ",              color: "#f87171", border: "rgba(239,68,68,0.3)",   bg: "rgba(239,68,68,0.1)"   },
  };

  const statusInfo = STATUS_LABELS[appStatus] ?? STATUS_LABELS["applied"];

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else groupedMessages.push({ date, msgs: [msg] });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="brand-card rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "rgba(196,173,255,0.3)", borderTopColor: "var(--lavender)" }} />
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка чата...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="brand-card rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">💬</div>
          <div className="font-body text-white/70 mb-4">{error}</div>
          <button onClick={() => router.back()}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── ШАПКА ЧАТА ── */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-4"
        style={{ borderBottom: "1px solid rgba(196,173,255,0.1)", background: "rgba(7,6,15,0.9)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          ←
        </button>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
          style={{ background: "rgba(92,46,204,0.25)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
          {otherPersonName[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{otherPersonName}</div>
          {jobTitle && (
            <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              Вакансия: {jobTitle}
            </div>
          )}
        </div>

        {/* Статус отклика */}
        <div className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}>
          {statusInfo.label}
        </div>
      </div>

      {/* ── СООБЩЕНИЯ ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ background: "var(--bg)" }}>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            <div className="text-5xl">💬</div>
            <div className="text-sm">Начните общение с {otherPersonName}</div>
          </div>
        ) : (
          groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              {/* Разделитель по дате */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                  {date}
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === currentUserId;
                const prevIsMe = i > 0 ? msgs[i - 1].sender_id === currentUserId : false;
                const grouped = isMe === prevIsMe && i > 0;

                return (
                  <div key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                    <div className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2.5 text-sm leading-relaxed`}
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, #5B2ECC, #7C4AE8)"
                          : "rgba(255,255,255,0.07)",
                        color: isMe ? "#fff" : "rgba(255,255,255,0.85)",
                        border: isMe ? "none" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: isMe
                          ? (grouped ? "18px 4px 18px 18px" : "18px 4px 18px 18px")
                          : (grouped ? "4px 18px 18px 18px" : "4px 18px 18px 18px"),
                        boxShadow: isMe ? "0 4px 16px rgba(92,46,204,0.3)" : "none",
                      }}>
                      <p style={{ wordBreak: "break-word" }}>{msg.message}</p>
                      <div className={`text-xs mt-1 text-right`}
                        style={{ color: isMe ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── ВВОД СООБЩЕНИЯ ── */}
      <div className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid rgba(196,173,255,0.08)", background: "rgba(7,6,15,0.95)" }}>
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Написать сообщение..."
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-body text-white focus:outline-none transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(196,173,255,0.15)",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex items-center justify-center w-11 h-11 rounded-2xl transition disabled:opacity-40 shrink-0"
            style={{ background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", boxShadow: "0 4px 16px rgba(92,46,204,0.4)" }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
