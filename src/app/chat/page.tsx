"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getConversations, type Conversation } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин.`;
  if (hours < 24) return `${hours} ч.`;
  if (days < 7) return `${days} д.`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function ChatsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth");
        return;
      }

      const convs = await getConversations();
      setConversations(convs);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin" 
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--chalk)" }}>
          💬 Сообщения
        </h1>

        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <svg className="w-8 h-8" style={{ color: "rgba(255,255,255,0.3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)" }}>У вас пока нет сообщений</p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Начните общение, откликнувшись на вакансию или пригласив кандидата
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="block rounded-xl p-4 transition hover:scale-[1.01]"
                style={{ 
                  background: conv.unreadCount > 0 ? "rgba(92,46,204,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${conv.unreadCount > 0 ? "rgba(92,46,204,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden"
                      style={{ 
                        background: conv.partnerAvatar 
                          ? undefined 
                          : "linear-gradient(135deg, #5B2ECC, #7C4AE8)",
                      }}>
                      {conv.partnerAvatar ? (
                        <img src={conv.partnerAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {(conv.partnerName?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "var(--brand-core)" }}>
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate" style={{ color: "var(--chalk)" }}>
                        {conv.partnerName || "Пользователь"}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    
                    {conv.jobTitle && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--lavender)" }}>
                        {conv.jobTitle}
                      </div>
                    )}
                    
                    <p className="text-sm truncate mt-1" 
                      style={{ color: conv.unreadCount > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }}>
                      {conv.lastMessage || "Начните диалог..."}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}