import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════
// API: Обработка очереди email уведомлений
// Вызывается по cron или вручную: POST /api/email/send
// ═══════════════════════════════════════════════════════════════════

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "FreedomHIRE <noreply@freedomhire.uz>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://freedomhire.uz";

// Email шаблоны
const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  new_application: (data) => ({
    subject: `Новый отклик на вакансию: ${data.job_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #5B2ECC, #7C4AE8); padding: 30px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .highlight { background: #F8F6FF; border-left: 4px solid #5B2ECC; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .btn { display: inline-block; background: #5B2ECC; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📩 Новый отклик!</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>На вашу вакансию откликнулся новый кандидат:</p>
            
            <div class="highlight">
              <strong>Кандидат:</strong> ${data.candidate_name || "Имя не указано"}<br>
              <strong>Вакансия:</strong> ${data.job_title || "Вакансия"}
            </div>
            
            <p>Просмотрите отклик и свяжитесь с кандидатом:</p>
            
            <a href="${SITE_URL}/employer/applications" class="btn">Посмотреть отклики</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FreedomHIRE · freedomhire.uz</p>
            <p>Вы получили это письмо, потому что у вас есть активная вакансия на FreedomHIRE.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  status_change: (data) => {
    const statusLabels: Record<string, string> = {
      pending: "На рассмотрении",
      viewed: "Просмотрен",
      interview: "Приглашение на собеседование",
      offered: "Предложение о работе",
      rejected: "Отказ",
      hired: "Принят на работу",
    };
    
    const newStatus = statusLabels[data.new_status] || data.new_status;
    const isPositive = ["interview", "offered", "hired"].includes(data.new_status);
    const isNegative = data.new_status === "rejected";
    
    return {
      subject: `Статус отклика изменён: ${data.job_title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${isPositive ? "#22c55e, #16a34a" : isNegative ? "#ef4444, #dc2626" : "#5B2ECC, #7C4AE8"}); padding: 30px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; background: ${isPositive ? "#dcfce7" : isNegative ? "#fee2e2" : "#F8F6FF"}; color: ${isPositive ? "#166534" : isNegative ? "#991b1b" : "#5B2ECC"}; }
            .highlight { background: #F8F6FF; border-left: 4px solid #5B2ECC; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .btn { display: inline-block; background: #5B2ECC; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isPositive ? "🎉" : isNegative ? "📋" : "📬"} Обновление статуса</h1>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
              <p>Статус вашего отклика изменился:</p>
              
              <div class="highlight">
                <strong>Вакансия:</strong> ${data.job_title}<br>
                <strong>Компания:</strong> ${data.company_name}<br><br>
                <strong>Новый статус:</strong> <span class="status-badge">${newStatus}</span>
              </div>
              
              ${isPositive ? "<p>🎊 Поздравляем! Работодатель заинтересован в вашей кандидатуре.</p>" : ""}
              ${isNegative ? "<p>К сожалению, в этот раз не сложилось. Не расстраивайтесь — продолжайте поиск!</p>" : ""}
              
              <a href="${SITE_URL}/applications" class="btn">Мои отклики</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FreedomHIRE · freedomhire.uz</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },

  new_message: (data) => ({
    subject: `Новое сообщение от ${data.sender_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #5B2ECC, #7C4AE8); padding: 30px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .message-box { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e9ecef; }
          .message-text { color: #333; font-size: 15px; line-height: 1.5; }
          .btn { display: inline-block; background: #5B2ECC; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Новое сообщение</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вам пришло новое сообщение от <strong>${data.sender_name || "пользователя"}</strong>:</p>
            
            <div class="message-box">
              <p class="message-text">"${data.message_preview}${data.message_preview?.length >= 100 ? "..." : ""}"</p>
            </div>
            
            <a href="${SITE_URL}/chat/${data.conversation_id}" class="btn">Ответить</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FreedomHIRE · freedomhire.uz</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

export async function POST(request: NextRequest) {
  // Проверка API ключа (для cron)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  // Используем service role для доступа к email_queue
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Получаем pending emails
  const { data: emails, error: fetchError } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(10);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!emails || emails.length === 0) {
    return NextResponse.json({ message: "No pending emails", processed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      // Увеличиваем счётчик попыток
      await supabase
        .from("email_queue")
        .update({ attempts: email.attempts + 1 })
        .eq("id", email.id);

      // Генерируем контент из шаблона
      const templateFn = templates[email.template];
      if (!templateFn) {
        throw new Error(`Unknown template: ${email.template}`);
      }

      const { subject, html } = templateFn(email.template_data);

      // Отправляем через Resend
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email.to_email,
          subject: email.subject || subject,
          html,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        throw new Error(errorData.message || "Resend API error");
      }

      // Успешно отправлено
      await supabase
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", email.id);

      sent++;
    } catch (err: any) {
      // Ошибка отправки
      const isFinalAttempt = email.attempts + 1 >= email.max_attempts;
      
      await supabase
        .from("email_queue")
        .update({
          status: isFinalAttempt ? "failed" : "pending",
          error_message: err.message,
        })
        .eq("id", email.id);

      failed++;
    }
  }

  return NextResponse.json({
    message: "Email processing complete",
    processed: emails.length,
    sent,
    failed,
  });
}

// GET для проверки статуса
export async function GET() {
  return NextResponse.json({
    status: "ok",
    configured: !!RESEND_API_KEY,
    endpoint: "/api/email/send",
  });
}
