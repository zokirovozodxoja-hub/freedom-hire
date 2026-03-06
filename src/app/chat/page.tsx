"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getConversations, getMessages, sendMessage as sendChatMessage,
  markMessagesAsRead, subscribeToMessages, unsubscribeFromMessages,
  type Conversation, type Message,
} from "@/lib/chat";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function formatSidebarTime(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "вчера";
  if (days < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function formatDateSep(iso: string) {
  const d = new Date(iso), today = new Date(), yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function Avatar({ src, name, size = 40, radius = 12 }: {
  src?: string | null; name?: string | null; size?: number; radius?: number;
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", flexShrink: 0, background: src ? undefined : "linear-gradient(135deg,#5B2ECC,#7C4AE8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.38 }}>{(name ?? "?")[0]?.toUpperCase()}</span>
      }
    </div>
  );
}

export default function MessengerPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/auth"); return; }
      const convs = await getConversations();
      setConversations(convs);
      setLoadingConvs(false);
      if (convs.length > 0) setActiveId(convs[0].id);
    })();
  }, [router]);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    if (channelRef.current) unsubscribeFromMessages(channelRef.current);
    (async () => {
      const msgs = await getMessages(activeId);
      setMessages(msgs);
      setLoadingMsgs(false);
      await markMessagesAsRead(activeId);
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, unreadCount: 0 } : c));
      channelRef.current = subscribeToMessages(activeId, (newMsg) => {
        setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (!newMsg.isMine) markMessagesAsRead(activeId);
      });
    })();
    return () => { if (channelRef.current) unsubscribeFromMessages(channelRef.current); };
  }, [activeId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending || !activeId) return;
    setSending(true);
    const content = text.trim();
    setText("");
    const sent = await sendChatMessage(activeId, content);
    if (sent) {
      setMessages((prev) => prev.find((m) => m.id === sent.id) ? prev : [...prev, sent]);
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, lastMessage: content, lastMessageAt: sent.createdAt } : c));
    }
    setSending(false);
    inputRef.current?.focus();
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDateSep(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  }

  const filteredConvs = conversations
    .filter((c) => !filterUnread || c.unreadCount > 0)
    .filter((c) => !search.trim() ||
      c.partnerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.jobTitle?.toLowerCase().includes(search.toLowerCase()));

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "var(--ink)", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(196,173,255,0.1)", background: "rgba(10,6,24,0.6)" }}>

        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(196,173,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: "var(--chalk)" }}>Чаты</span>
            {totalUnread > 0 && (
              <span style={{ background: "var(--brand-core)", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>{totalUnread}</span>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..."
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px 8px 30px", color: "#fff", fontSize: 13, outline: "none" }} />
          </div>
          <div onClick={() => setFilterUnread((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: filterUnread ? "var(--brand-core)" : "rgba(255,255,255,0.1)", border: `1px solid ${filterUnread ? "var(--brand-core)" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {filterUnread && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", userSelect: "none" }}>Только непрочитанные</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            [1,2,3].map((i) => <div key={i} style={{ height: 72, margin: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)" }} />)
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              {filterUnread ? "Нет непрочитанных" : "Нет диалогов"}
            </div>
          ) : filteredConvs.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div key={conv.id} onClick={() => setActiveId(conv.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderLeft: `3px solid ${isActive ? "var(--brand-core)" : "transparent"}`, background: isActive ? "rgba(92,46,204,0.2)" : conv.unreadCount > 0 ? "rgba(92,46,204,0.06)" : "transparent", transition: "all .15s" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = conv.unreadCount > 0 ? "rgba(92,46,204,0.06)" : "transparent"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar src={conv.partnerAvatar} name={conv.partnerName} size={44} radius={12} />
                  {conv.unreadCount > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -4, background: "var(--lavender)", color: "var(--ink)", borderRadius: 99, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid var(--ink)" }}>
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 500, color: conv.unreadCount > 0 ? "#fff" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.partnerName ?? "Пользователь"}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
                      {conv.lastMessageAt ? formatSidebarTime(conv.lastMessageAt) : ""}
                    </span>
                  </div>
                  {conv.jobTitle && <div style={{ fontSize: 11, color: "var(--lavender)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{conv.jobTitle}</div>}
                  <div style={{ fontSize: 12, marginTop: 2, color: conv.unreadCount > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: conv.unreadCount > 0 ? 500 : 400 }}>
                    {conv.lastMessage ?? "Начните диалог..."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      {activeConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(196,173,255,0.1)", background: "rgba(10,6,24,0.7)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
            <Avatar src={activeConv.partnerAvatar} name={activeConv.partnerName} size={40} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--chalk)" }}>{activeConv.partnerName ?? "Пользователь"}</div>
              {activeConv.jobTitle && <div style={{ fontSize: 12, color: "var(--lavender)", marginTop: 1 }}>{activeConv.jobTitle}</div>}
            </div>
            {activeConv.jobId && (
              <Link href={`/jobs/${activeConv.jobId}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--lavender)", background: "rgba(92,46,204,0.15)", border: "1px solid rgba(196,173,255,0.2)", borderRadius: 8, padding: "5px 12px", textDecoration: "none" }}>
                Вакансия
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </Link>
            )}
            {activeConv.partnerRole === "candidate" && (
              <Link href={`/candidates/${activeConv.partnerId}`} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 12px", textDecoration: "none" }}>Профиль</Link>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", background: "var(--bg)" }}>
            {loadingMsgs ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)", animation: "spin .8s linear infinite" }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(92,46,204,0.12)", border: "1px solid rgba(92,46,204,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Начните диалог с {activeConv.partnerName ?? "пользователем"}</p>
              </div>
            ) : (
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                {grouped.map(({ date, msgs }) => (
                  <div key={date}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 12px" }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "3px 12px" }}>{date}</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    </div>
                    {msgs.map((msg, i) => {
                      const prevSame = i > 0 && msgs[i-1].isMine === msg.isMine;
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: msg.isMine ? "flex-end" : "flex-start", marginTop: prevSame ? 3 : 12 }}>
                          {!msg.isMine && (
                            <div style={{ marginRight: 8, alignSelf: "flex-end", marginBottom: 2, flexShrink: 0 }}>
                              {!prevSame
                                ? <Avatar src={activeConv.partnerAvatar} name={activeConv.partnerName} size={28} radius={8} />
                                : <div style={{ width: 28 }} />}
                            </div>
                          )}
                          <div style={{ maxWidth: "60%", padding: "10px 14px", borderRadius: msg.isMine ? (prevSame ? "18px 4px 18px 18px" : "18px 18px 4px 18px") : (prevSame ? "4px 18px 18px 18px" : "18px 18px 18px 4px"), background: msg.isMine ? "linear-gradient(135deg,#5B2ECC,#7C4AE8)" : "rgba(255,255,255,0.07)", border: msg.isMine ? "none" : "1px solid rgba(255,255,255,0.08)", boxShadow: msg.isMine ? "0 4px 20px rgba(92,46,204,0.35)" : "none" }}>
                            <p style={{ fontSize: 14, lineHeight: 1.5, color: msg.isMine ? "#fff" : "rgba(255,255,255,0.85)", wordBreak: "break-word", margin: 0 }}>{msg.content}</p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: msg.isMine ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.3)" }}>{formatTime(msg.createdAt)}</span>
                              {msg.isMine && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={msg.isRead ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  {msg.isRead ? <><path d="M18 7l-8 8-4-4"/><path d="M22 7l-8 8"/></> : <path d="M5 13l4 4L19 7"/>}
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div style={{ padding: "12px 24px", flexShrink: 0, borderTop: "1px solid rgba(196,173,255,0.08)", background: "rgba(10,6,24,0.9)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 720, margin: "0 auto" }}>
              <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Написать сообщение..."
                style={{ flex: 1, borderRadius: 14, padding: "11px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(196,173,255,0.15)", color: "#fff", fontSize: 14, outline: "none" }} />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                style={{ width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: text.trim() ? "linear-gradient(135deg,#5B2ECC,#7C4AE8)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", boxShadow: text.trim() ? "0 4px 16px rgba(92,46,204,0.4)" : "none" }}>
                {sending
                  ? <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .8s linear infinite" }} />
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#fff" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(92,46,204,0.12)", border: "1px solid rgba(92,46,204,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--chalk)", marginBottom: 6 }}>Выберите диалог</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Выберите чат слева или откликнитесь на вакансию</p>
          </div>
          <Link href="/jobs" style={{ marginTop: 4, padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg,#5B2ECC,#7C4AE8)", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 24px rgba(92,46,204,0.4)" }}>
            Смотреть вакансии
          </Link>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(196,173,255,0.15); border-radius: 99px; }
      `}</style>
    </div>
  );
}