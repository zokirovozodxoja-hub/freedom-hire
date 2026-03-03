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
  const [otherPersonName, setOtherPersonName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [applicationId]);

  async function loadChat() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/auth"); return; }
    
    setCurrentUserId(userData.user.id);

    // Загружаем отклик
    const { data: appData } = await supabase
      .from("applications")
      .select("*, jobs(title, company_id), profiles!applications_candidate_id_fkey(full_name, email)")
      .eq("id", applicationId)
      .single();
    
    if (!appData) return;
    setApplication(appData);

    // Определяем с кем переписываемся
    if (appData.candidate_id === userData.user.id) {
      // Я - кандидат, переписываюсь с работодателем
      const { data: companyData } = await supabase
        .from("companies")
        .select("name, owner_id")
        .eq("id", appData.jobs.company_id)
        .single();
      setOtherPersonName(companyData?.name || "Работодатель");
    } else {
      // Я - работодатель, переписываюсь с кандидатом
      setOtherPersonName(appData.profiles?.full_name || appData.profiles?.email || "Кандидат");
    }

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

    const receiverId = application?.candidate_id === userData.user.id 
      ? application?.jobs?.company?.owner_id 
      : application?.candidate_id;

    await supabase.from("messages").insert({
      application_id: applicationId,
      sender_id: userData.user.id,
      receiver_id: receiverId,
      message: newMessage.trim(),
    });

    setNewMessage("");
    loadChat();
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">{otherPersonName}</h1>
            <p className="text-sm text-gray-500">{application?.jobs?.title}</p>
          </div>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm font-medium">
            Закрыть
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>Начните общение</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md px-4 py-3 rounded-2xl ${
                    isMe 
                      ? "bg-blue-600 text-white" 
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-500"}`}>
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
      <div className="bg-white border-t p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Введите сообщение..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-semibold transition"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
