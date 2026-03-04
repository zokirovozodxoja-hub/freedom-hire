"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getMessages,
  sendMessage as sendChatMessage,
  markMessagesAsRead,
  subscribeToMessages,
  unsubscribeFromMessages,
  type Message,
} from "@/lib/chat";

type ConversationInfo = {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerAvatar: string | null;
  partnerRole: "employer" | "candidate";
  jobTitle: string | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [convInfo, setConvInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  // Скролл к последнему сообщению
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Загрузка данных
  useEffect(() => {
    let mounted = true;

    async function loadChat() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        router.replace("/auth");
        return;
      }

      const myId = userData.user.id;

      // Получаем информацию о диалоге
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select(`
          id,
          employer_id,
          candidate_id,
          job_id,
          employer:profiles!employer_id(id, full_name, avatar_url),
          candidate:profiles!candidate_id(id, full_name, avatar_url),
          job:jobs(title)
        `)
        .eq("id", conversationId)
        .maybeSingle();

      if (convErr || !conv) {
        if (mounted) {
          setError("Диалог не найден");
          setLoading(false);
        }
        return;
      }

      // Проверяем доступ
      if (conv.employer_id !== myId && conv.candidate_id !== myId) {
        if (mounted) {
          setError("У вас нет доступа к этому диалогу");
          setLoading(false);
        }
        return;
      }

      const isEmployer = conv.employer_id === myId;
      const partner = isEmployer ? (conv.candidate as any) : (conv.employer as any);

      if (mounted) {
        setConvInfo({
          id: conv.id,
          partnerId: partner?.id ?? "",
          partnerName: partner?.full_name ?? null,
          partnerAvatar: partner?.avatar_url ?? null,
          partnerRole: isEmployer ? "candidate" : "employer",
          jobTitle: (conv.job as any)?.title ?? null,
        });
      }

      // Загружаем сообщения
      const msgs = await getMessages(conversationId);
      if (mounted) {
        setMessages(msgs);
        setLoading(false);
      }

      // Помечаем как прочитанные
      await markMessagesAsRead(conversationId);

      // Подписка на новые сообщения
      channelRef.current = subscribeToMessages(conversationId, (newMsg) => {
        if (mounted) {
          setMessages((prev) => {
            // Избегаем дублей
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Помечаем как прочитанные если не наше
          if (!newMsg.isMine) {
            markMessagesAsRead(conversationId);
          }
        }
      });

      // Фокус на input
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    loadChat();

    return () => {
      mounted = false;
      if (channelRef.current) {
        unsubscribeFromMessages(channelRef.current);
      }
    };
  }, [conversationId, router]);

  // Отправка сообщения
  async function handleSend() {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    const sent = await sendChatMessage(conversationId, text);
    
    if (sent) {
      // Сообщение добавится через realtime, но на всякий случай
      setMessages((prev) => {
        if (prev.find((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    }

    setSending(false);
    inputRef.current?.focus();
  }

  // Группировка сообщений по дате
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка чата...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="text-3xl">💬</span>
          </div>
          <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>{error}</p>
          <button onClick={() => router.back()}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
            Назад
          </button>
        </div>
      </div>
    );
  }

  const initials = convInfo?.partnerName?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ 
          borderBottom: "1px solid rgba(196,173,255,0.1)", 
          background: "rgba(7,6,15,0.95)",
          backdropFilter: "blur(12px)",
        }}>
        <Link href="/chat"
          className="flex items-center justify-center w-9 h-9 rounded-xl transition hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
          style={{ 
            background: convInfo?.partnerAvatar ? undefined : "linear-gradient(135deg, #5B2ECC, #7C4AE8)",
          }}>
          {convInfo?.partnerAvatar ? (
            <img src={convInfo.partnerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" style={{ color: "var(--chalk)" }}>
            {convInfo?.partnerName || "Пользователь"}
          </div>
          {convInfo?.jobTitle && (
            <div className="text-xs truncate" style={{ color: "var(--lavender)" }}>
              {convInfo.jobTitle}
            </div>
          )}
        </div>

        {/* Partner profile link */}
        {convInfo?.partnerRole === "candidate" && (
          <Link href={`/candidates/${convInfo.partnerId}`}
            className="text-xs px-3 py-1.5 rounded-lg transition hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
            Профиль
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "var(--bg)" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(92,46,204,0.12)", border: "1px solid rgba(92,46,204,0.2)" }}>
              <svg className="w-7 h-7" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Начните диалог с {convInfo?.partnerName || "пользователем"}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-1">
            {groupedMessages.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-xs px-3 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                    {date}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Messages */}
                {msgs.map((msg, i) => {
                  const prevIsMe = i > 0 ? msgs[i - 1].isMine === msg.isMine : false;
                  const grouped = prevIsMe && i > 0;

                  return (
                    <div key={msg.id}
                      className={`flex ${msg.isMine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                      <div className="max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2.5 text-sm leading-relaxed"
                        style={{
                          background: msg.isMine
                            ? "linear-gradient(135deg, #5B2ECC, #7C4AE8)"
                            : "rgba(255,255,255,0.07)",
                          color: msg.isMine ? "#fff" : "rgba(255,255,255,0.85)",
                          border: msg.isMine ? "none" : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: msg.isMine
                            ? (grouped ? "18px 4px 18px 18px" : "18px 18px 4px 18px")
                            : (grouped ? "4px 18px 18px 18px" : "18px 18px 18px 4px"),
                          boxShadow: msg.isMine ? "0 4px 16px rgba(92,46,204,0.3)" : "none",
                        }}>
                        <p style={{ wordBreak: "break-word" }}>{msg.content}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <span className="text-xs"
                            style={{ color: msg.isMine ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}>
                            {formatTime(msg.createdAt)}
                          </span>
                          {msg.isMine && (
                            <svg className="w-3.5 h-3.5" 
                              style={{ color: msg.isRead ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={msg.isRead ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid rgba(196,173,255,0.08)", background: "rgba(7,6,15,0.95)" }}>
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Написать сообщение..."
            className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(196,173,255,0.15)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="flex items-center justify-center w-11 h-11 rounded-2xl transition disabled:opacity-40 shrink-0"
            style={{ 
              background: "linear-gradient(135deg, #5B2ECC, #7C4AE8)", 
              boxShadow: "0 4px 16px rgba(92,46,204,0.4)",
            }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
