/**
 * Email Notifications Library
 * 
 * Для работы необходимо настроить:
 * 1. Resend API (рекомендуется) или другой email сервис
 * 2. Добавить RESEND_API_KEY в env переменные
 * 3. Настроить домен для отправки email
 * 
 * Пока используем Supabase Edge Functions для отправки
 */

import { createClient } from "@/lib/supabase/client";

export type NotificationType = 
  | "new_application"      // Работодателю: новый отклик
  | "application_viewed"   // Кандидату: отклик просмотрен
  | "application_status"   // Кандидату: изменился статус отклика
  | "new_message"          // Новое сообщение в чате
  | "interview_invite"     // Кандидату: приглашение на интервью
  | "job_match";           // Кандидату: новая подходящая вакансия

export type NotificationPayload = {
  type: NotificationType;
  recipientId: string;
  recipientEmail?: string;
  data: Record<string, any>;
};

/**
 * Отправить уведомление (in-app + email)
 */
export async function sendNotification(payload: NotificationPayload) {
  const supabase = createClient();
  
  // 1. Создаём in-app уведомление
  const { error: notifError } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.recipientId,
      type: payload.type,
      title: getNotificationTitle(payload.type, payload.data),
      message: getNotificationMessage(payload.type, payload.data),
      data: payload.data,
      is_read: false,
    });

  if (notifError) {
    console.error("Failed to create notification:", notifError);
  }

  // 2. Проверяем настройки email пользователя
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("email_notifications")
    .eq("user_id", payload.recipientId)
    .maybeSingle();

  // Если email уведомления включены (по умолчанию да)
  if (prefs?.email_notifications !== false && payload.recipientEmail) {
    await queueEmail({
      to: payload.recipientEmail,
      subject: getEmailSubject(payload.type, payload.data),
      template: payload.type,
      data: payload.data,
    });
  }

  return { success: true };
}

/**
 * Добавить email в очередь отправки
 */
async function queueEmail(params: {
  to: string;
  subject: string;
  template: NotificationType;
  data: Record<string, any>;
}) {
  const supabase = createClient();
  
  // Сохраняем в очередь для обработки Edge Function
  await supabase.from("email_queue").insert({
    to_email: params.to,
    subject: params.subject,
    template: params.template,
    template_data: params.data,
    status: "pending",
  });
}

/**
 * Уведомление о новом отклике (для работодателя)
 */
export async function notifyNewApplication(params: {
  employerId: string;
  employerEmail: string;
  candidateName: string;
  jobTitle: string;
  applicationId: string;
}) {
  return sendNotification({
    type: "new_application",
    recipientId: params.employerId,
    recipientEmail: params.employerEmail,
    data: {
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      applicationId: params.applicationId,
      actionUrl: `/employer/applications`,
    },
  });
}

/**
 * Уведомление об изменении статуса отклика (для кандидата)
 */
export async function notifyApplicationStatus(params: {
  candidateId: string;
  candidateEmail: string;
  companyName: string;
  jobTitle: string;
  newStatus: string;
  applicationId: string;
}) {
  return sendNotification({
    type: "application_status",
    recipientId: params.candidateId,
    recipientEmail: params.candidateEmail,
    data: {
      companyName: params.companyName,
      jobTitle: params.jobTitle,
      status: params.newStatus,
      statusLabel: getStatusLabel(params.newStatus),
      applicationId: params.applicationId,
      actionUrl: `/applications`,
    },
  });
}

/**
 * Уведомление о новом сообщении
 */
export async function notifyNewMessage(params: {
  recipientId: string;
  recipientEmail: string;
  senderName: string;
  messagePreview: string;
  applicationId: string;
}) {
  return sendNotification({
    type: "new_message",
    recipientId: params.recipientId,
    recipientEmail: params.recipientEmail,
    data: {
      senderName: params.senderName,
      messagePreview: params.messagePreview.slice(0, 100),
      applicationId: params.applicationId,
      actionUrl: `/chat/${params.applicationId}`,
    },
  });
}

/**
 * Уведомление о приглашении на интервью
 */
export async function notifyInterviewInvite(params: {
  candidateId: string;
  candidateEmail: string;
  companyName: string;
  jobTitle: string;
  interviewDate?: string;
  interviewLocation?: string;
  applicationId: string;
}) {
  return sendNotification({
    type: "interview_invite",
    recipientId: params.candidateId,
    recipientEmail: params.candidateEmail,
    data: {
      companyName: params.companyName,
      jobTitle: params.jobTitle,
      interviewDate: params.interviewDate,
      interviewLocation: params.interviewLocation,
      applicationId: params.applicationId,
      actionUrl: `/chat/${params.applicationId}`,
    },
  });
}

// ============ Helpers ============

function getNotificationTitle(type: NotificationType, data: Record<string, any>): string {
  switch (type) {
    case "new_application":
      return "Новый отклик на вакансию";
    case "application_viewed":
      return "Ваш отклик просмотрен";
    case "application_status":
      return "Статус отклика изменён";
    case "new_message":
      return `Сообщение от ${data.senderName}`;
    case "interview_invite":
      return "Приглашение на интервью!";
    case "job_match":
      return "Новая подходящая вакансия";
    default:
      return "Уведомление";
  }
}

function getNotificationMessage(type: NotificationType, data: Record<string, any>): string {
  switch (type) {
    case "new_application":
      return `${data.candidateName} откликнулся на вакансию "${data.jobTitle}"`;
    case "application_viewed":
      return `${data.companyName} просмотрел ваш отклик на "${data.jobTitle}"`;
    case "application_status":
      return `${data.companyName}: ${data.statusLabel} — "${data.jobTitle}"`;
    case "new_message":
      return data.messagePreview;
    case "interview_invite":
      return `${data.companyName} приглашает вас на интервью по вакансии "${data.jobTitle}"`;
    case "job_match":
      return `Новая вакансия "${data.jobTitle}" соответствует вашим навыкам`;
    default:
      return "";
  }
}

function getEmailSubject(type: NotificationType, data: Record<string, any>): string {
  switch (type) {
    case "new_application":
      return `[FreedomHIRE] Новый отклик: ${data.candidateName} → ${data.jobTitle}`;
    case "application_viewed":
      return `[FreedomHIRE] Ваш отклик просмотрен — ${data.companyName}`;
    case "application_status":
      return `[FreedomHIRE] ${data.statusLabel} — ${data.jobTitle}`;
    case "new_message":
      return `[FreedomHIRE] Новое сообщение от ${data.senderName}`;
    case "interview_invite":
      return `[FreedomHIRE] 🎉 Приглашение на интервью — ${data.companyName}`;
    case "job_match":
      return `[FreedomHIRE] Новая вакансия для вас: ${data.jobTitle}`;
    default:
      return "[FreedomHIRE] Уведомление";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    applied: "Отклик получен",
    viewed: "Просмотрен",
    in_progress: "На рассмотрении",
    invited: "Приглашение на интервью",
    rejected: "Отказ",
    hired: "Вы приняты!",
  };
  return labels[status] ?? status;
}
