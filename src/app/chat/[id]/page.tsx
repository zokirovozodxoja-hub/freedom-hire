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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [application, setApplication] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, 3000); // Обновление каждые 3 сек
    return () => clearInterval(interval);
  }, [applicationId]);

  async function loadChat() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/auth"); return; }
    
    setCurrentUserId(userData.user.id);

    // Загружаем информацию об отклике
    const { data: appData } = await supabase
      .from("applications")
      .select("*, jobs(title), profiles!applications_candidate_id_fkey(full_name)")
      .eq("id", applicationId)
      .single();
    
    setApplication(appData);

    // Загружаем сообщения
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
    setLoading(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("messages").insert({
      application_id: applicationId,
      sender_id: userData.user.id,
      receiver_id: application?.candidate_id === userData.user.id ? application?.jobs?.company?.owner_id : application?.candidate_id,
      message: newMessage.trim(),
    });

    setNewMessage("");
    loadChat();
  }

  if (loading) return <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex flex-col">
      
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{application?.profiles?.full_name || "Кандидат"}</h1>
            <p className="text-sm text-white/50">{application?.jobs?.title}</p>
          </div>
          <button onClick={() => router.back()} className="text-violet-400 hover:underline text-sm">
            Закрыть
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-white/40 py-12">
              <p>Начните общение</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md px-4 py-3 rounded-2xl ${isMe ? "bg-violet-600 text-white" : "bg-white/10 text-white"}`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/5 border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Напишите сообщение..."
            className="flex-1 px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 outline-none focus:border-violet-500/50"
          />
          <button onClick={sendMessage} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold transition">
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
