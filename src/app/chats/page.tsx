"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ChatPreview = {
  applicationId: string;
  otherPersonName: string;
  otherPersonAvatar: string | null;
  jobTitle: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  status: string;
  isEmployer: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  applied: { bg: "rgba(196,173,255,0.1)", color: "#C4ADFF", border: "rgba(196,173,255,0.3)" },
  in_progress: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  invited: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.3)" },
  rejected: { bg: "rgba(239,68,68,0.1)", color: "#f87171", border: "rgba(239,68,68,0.3)" },
  hired: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "rgba(34,197,94,0.3)" },
};

const STATUS_LABELS: Record<string, string> = {
  applied: "Отклик",
  in_progress: "В процессе",
  invited: "Приглашён",
  rejected: "Отказ",
  hired: "Нанят",
};

export default function ChatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      router.push("/auth");
      return;
    }

    const userId = userData.user.id;
    setCurrentUserId(userId);

    // Получаем профиль пользователя для определения роли
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const isEmployer = profile?.role === "employer";

    // Получаем все отклики связанные с пользователем
    let query = supabase
      .from("applications")
      .select(`
        id,
        status,
        candidate_id,
        job_id,
        jobs (
          title,
          company_id,
          companies (
            name,
            owner_id
          )
        )
      `);

    if (isEmployer) {
      // Для работодателя - отклики на его вакансии
      const { data: myCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (myCompany) {
        query = query.eq("jobs.company_id", myCompany.id);
      }
    } else {
      // Для кандидата - его отклики
      query = query.eq("candidate_id", userId);
    }

    const { data: applications } = await query.order("created_at", { ascending: false });

    if (!applications) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Собираем превью чатов
    const chatPreviews: ChatPreview[] = [];

    for (const app of applications) {
      const job = app.jobs as any;
      if (!job) continue;

      // Получаем последнее сообщение
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("message, created_at, sender_id")
        .eq("application_id", app.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Считаем непрочитанные
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("application_id", app.id)
        .eq("is_read", false)
        .neq("sender_id", userId);

      // Определяем другого участника
      let otherPersonName = "";
      let otherPersonAvatar: string | null = null;

      if (isEmployer) {
        // Для работодателя - показываем кандидата
        const { data: candidate } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", app.candidate_id)
          .maybeSingle();
        otherPersonName = candidate?.full_name ?? "Кандидат";
        otherPersonAvatar = candidate?.avatar_url ?? null;
      } else {
        // Для кандидата - показываем компанию
        otherPersonName = job.companies?.name ?? "Компания";
      }

      chatPreviews.push({
        applicationId: app.id,
        otherPersonName,
        otherPersonAvatar,
        jobTitle: job.title ?? "Вакансия",
        lastMessage: lastMsg?.message ?? null,
        lastMessageTime: lastMsg?.created_at ?? null,
        unreadCount: unreadCount ?? 0,
        status: app.status ?? "applied",
        isEmployer,
      });
    }

    // Сортируем по последнему сообщению
    chatPreviews.sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    setChats(chatPreviews);
    setLoading(false);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Вчера";
    } else if (days < 7) {
      return date.toLocaleDateString("ru-RU", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    }
  }

  const filteredChats = filter === "unread" 
    ? chats.filter(c => c.unreadCount > 0)
    : chats;

  const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>Сообщения</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {chats.length} {chats.length === 1 ? "диалог" : "диалогов"}
              {totalUnread > 0 && <span style={{ color: "var(--lavender)" }}> · {totalUnread} непрочитанных</span>}
            </p>
          </div>
          
          {/* Фильтр */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === "all" ? "text-white" : ""}`}
              style={{
                background: filter === "all" ? "var(--brand-core)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${filter === "all" ? "var(--brand-core)" : "rgba(255,255,255,0.1)"}`,
                color: filter === "all" ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              Все
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2`}
              style={{
                background: filter === "unread" ? "var(--brand-core)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${filter === "unread" ? "var(--brand-core)" : "rgba(255,255,255,0.1)"}`,
                color: filter === "unread" ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              Непрочитанные
              {totalUnread > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: filter === "unread" ? "white" : "var(--lavender)", color: filter === "unread" ? "var(--brand-core)" : "var(--ink)" }}>
                  {totalUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Список чатов */}
        {filteredChats.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.25)" }}>
              <svg className="w-8 h-8" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--chalk)" }}>
              {filter === "unread" ? "Нет непрочитанных сообщений" : "Нет сообщений"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              {filter === "unread" 
                ? "Все сообщения прочитаны"
                : "Откликайтесь на вакансии, чтобы начать общение с работодателями"
              }
            </p>
            {filter === "all" && (
              <Link href="/jobs" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white">
                Смотреть вакансии
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => {
              const statusStyle = STATUS_COLORS[chat.status] ?? STATUS_COLORS.applied;
              
              return (
                <Link
                  key={chat.applicationId}
                  href={`/chat/${chat.applicationId}`}
                  className="block rounded-2xl p-4 transition hover:scale-[1.01]"
                  style={{ 
                    background: chat.unreadCount > 0 ? "rgba(92,46,204,0.08)" : "rgba(255,255,255,0.03)", 
                    border: `1px solid ${chat.unreadCount > 0 ? "rgba(92,46,204,0.2)" : "rgba(255,255,255,0.06)"}` 
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Аватар */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #3D14BB, #7C4AE8)", border: "2px solid rgba(92,46,204,0.3)" }}>
                        {chat.otherPersonAvatar ? (
                          <img src={chat.otherPersonAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-white">{chat.otherPersonName[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "var(--lavender)", color: "var(--ink)" }}>
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold truncate" style={{ color: chat.unreadCount > 0 ? "white" : "rgba(255,255,255,0.9)" }}>
                            {chat.otherPersonName}
                          </h3>
                          <p className="text-xs truncate" style={{ color: "var(--lavender)" }}>{chat.jobTitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Последнее сообщение */}
                      <p className="text-sm mt-2 truncate" 
                        style={{ color: chat.unreadCount > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }}>
                        {chat.lastMessage ?? "Нет сообщений"}
                      </p>

                      {/* Статус */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                          {STATUS_LABELS[chat.status] ?? chat.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
