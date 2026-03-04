import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════
// ЧАТ СИСТЕМА
// ═══════════════════════════════════════════════════════════════════

export type Conversation = {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerAvatar: string | null;
  partnerRole: "employer" | "candidate";
  jobId: string | null;
  jobTitle: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
};

// Получить или создать диалог
export async function getOrCreateConversation(
  partnerId: string,
  jobId?: string,
  applicationId?: string
): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const myId = userData.user.id;

  // Определяем роли
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", myId)
    .single();

  const isEmployer = myProfile?.role === "employer";

  const employerId = isEmployer ? myId : partnerId;
  const candidateId = isEmployer ? partnerId : myId;

  // Ищем существующий диалог
  let query = supabase
    .from("conversations")
    .select("id")
    .eq("employer_id", employerId)
    .eq("candidate_id", candidateId);

  if (jobId) {
    query = query.eq("job_id", jobId);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return { id: existing.id };
  }

  // Создаём новый диалог
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      employer_id: employerId,
      candidate_id: candidateId,
      job_id: jobId ?? null,
      application_id: applicationId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return null;
  }

  return { id: newConv.id };
}

// Получить список диалогов
export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const myId = userData.user.id;

  const { data: convs } = await supabase
    .from("conversations")
    .select(`
      id,
      employer_id,
      candidate_id,
      job_id,
      last_message_text,
      last_message_at,
      employer_unread,
      candidate_unread,
      employer:profiles!employer_id(id, full_name, avatar_url),
      candidate:profiles!candidate_id(id, full_name, avatar_url),
      job:jobs(title)
    `)
    .or(`employer_id.eq.${myId},candidate_id.eq.${myId}`)
    .order("last_message_at", { ascending: false });

  return (convs ?? []).map((c: any) => {
    const isEmployer = c.employer_id === myId;
    const partner = isEmployer ? c.candidate : c.employer;

    return {
      id: c.id,
      partnerId: partner?.id ?? "",
      partnerName: partner?.full_name ?? null,
      partnerAvatar: partner?.avatar_url ?? null,
      partnerRole: isEmployer ? "candidate" : "employer",
      jobId: c.job_id,
      jobTitle: c.job?.title ?? null,
      lastMessage: c.last_message_text,
      lastMessageAt: c.last_message_at,
      unreadCount: isEmployer ? c.employer_unread : c.candidate_unread,
    };
  });
}

// Получить сообщения диалога
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const myId = userData.user.id;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (messages ?? []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    isRead: m.is_read,
    createdAt: m.created_at,
    isMine: m.sender_id === myId,
  }));
}

// Отправить сообщение
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return null;
  }

  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    content: msg.content,
    isRead: msg.is_read,
    createdAt: msg.created_at,
    isMine: true,
  };
}

// Пометить сообщения как прочитанные
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const myId = userData.user.id;

  // Помечаем непрочитанные сообщения от другого участника
  await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myId)
    .eq("is_read", false);

  // Сбрасываем счётчик непрочитанных
  const { data: conv } = await supabase
    .from("conversations")
    .select("employer_id, candidate_id")
    .eq("id", conversationId)
    .single();

  if (conv) {
    const isEmployer = conv.employer_id === myId;
    await supabase
      .from("conversations")
      .update(isEmployer ? { employer_unread: 0 } : { candidate_unread: 0 })
      .eq("id", conversationId);
  }
}

// Подписка на новые сообщения (Realtime)
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const m = payload.new as any;
        supabase.auth.getUser().then(({ data }) => {
          onNewMessage({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content,
            isRead: m.is_read,
            createdAt: m.created_at,
            isMine: m.sender_id === data.user?.id,
          });
        });
      }
    )
    .subscribe();

  return channel;
}

// Отписка от канала
export function unsubscribeFromMessages(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}

// Получить количество непрочитанных сообщений
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;

  const myId = userData.user.id;

  const { data: convs } = await supabase
    .from("conversations")
    .select("employer_id, candidate_id, employer_unread, candidate_unread")
    .or(`employer_id.eq.${myId},candidate_id.eq.${myId}`);

  let total = 0;
  for (const c of convs ?? []) {
    const isEmployer = c.employer_id === myId;
    total += isEmployer ? c.employer_unread : c.candidate_unread;
  }

  return total;
}
