"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadUnreadMessages();
    
    // Подписка на новые уведомления в реальном времени
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-and-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadUnreadMessages() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const myId = userData.user.id;

    // Получаем непрочитанные сообщения из conversations
    const { data: convs } = await supabase
      .from("conversations")
      .select("employer_id, candidate_id, employer_unread, candidate_unread")
      .or(`employer_id.eq.${myId},candidate_id.eq.${myId}`);

    let total = 0;
    for (const c of convs ?? []) {
      const isEmployer = c.employer_id === myId;
      total += isEmployer ? (c.employer_unread ?? 0) : (c.candidate_unread ?? 0);
    }
    setUnreadMessages(total);
  }

  async function loadNotifications() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }

    setLoading(false);
  }

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userData.user.id)
      .eq("is_read", false);

    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "application_status":
        return "📝";
      case "new_application":
        return "📩";
      case "profile_view":
        return "👁️";
      case "new_job":
        return "💼";
      case "new_message":
        return "💬";
      default:
        return "🔔";
    }
  }

  function formatTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  }

  if (loading) return null;

  const totalUnread = unreadCount + unreadMessages;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">Уведомления</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-400 hover:underline"
                >
                  Отметить все прочитанными
                </button>
              )}
            </div>

            {/* Messages shortcut */}
            {unreadMessages > 0 && (
              <Link
                href="/chat"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-4 bg-violet-500/10 border-b border-white/10 hover:bg-violet-500/20 transition"
              >
                <span className="text-2xl">💬</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">Новые сообщения</div>
                  <div className="text-xs text-white/50">{unreadMessages} непрочитанных</div>
                </div>
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 && unreadMessages === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-white/40 text-sm">Нет уведомлений</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-white/40 text-sm">
                  Нет других уведомлений
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-white/5 transition cursor-pointer ${
                        !notif.is_read ? "bg-violet-500/5" : ""
                      }`}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          window.location.href = notif.link;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-white text-sm leading-snug">
                              {notif.title}
                            </h4>
                            {!notif.is_read && (
                              <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed mb-1">
                            {notif.message}
                          </p>
                          <span className="text-xs text-white/30">
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 flex gap-2">
              <Link
                href="/chat"
                className="flex-1 text-center text-sm py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition"
                onClick={() => setIsOpen(false)}
              >
                💬 Сообщения
              </Link>
              {notifications.length > 0 && (
                <Link
                  href="/notifications"
                  className="flex-1 text-center text-sm py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition"
                  onClick={() => setIsOpen(false)}
                >
                  Все уведомления
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
