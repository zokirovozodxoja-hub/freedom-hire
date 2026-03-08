import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://freedomhire.uz";

const ROLE_LABELS: Record<string, string> = {
  admin:          "Администратор",
  recruiter:      "Рекрутер",
  hiring_manager: "Hiring Manager",
  observer:       "Наблюдатель",
};

export async function POST(request: NextRequest) {
  try {
    const { email, name, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: "email и role обязательны" }, { status: 400 });
    }

    // Аутентификация через куки
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Service role для записи
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Получаем member текущего пользователя
    const { data: member } = await supabase
      .from("company_members")
      .select("id, company_id, role")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Не найден профиль сотрудника" }, { status: 403 });
    }

    if (!["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    // Проверяем дубликат
    const { data: existing } = await supabase
      .from("company_invitations")
      .select("id")
      .eq("company_id", member.company_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Приглашение на этот email уже отправлено" }, { status: 409 });
    }

    // Создаём приглашение
    const { data: invitation, error: invErr } = await supabase
      .from("company_invitations")
      .insert({
        company_id: member.company_id,
        email: email.toLowerCase(),
        name: name?.trim() || null,
        role,
        invited_by: member.id,
      })
      .select("token, expires_at")
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: "Не удалось создать приглашение" }, { status: 500 });
    }

    // Получаем данные компании и пригласившего
    const [{ data: company }, { data: inviterProfile }] = await Promise.all([
      supabase.from("companies").select("name").eq("id", member.company_id).single(),
      supabase.from("profiles").select("full_name").eq("id", userData.user.id).single(),
    ]);

    // Отправляем письмо напрямую через Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || "FreedomHIRE <noreply@freedomhire.uz>";

    console.log("[invite] RESEND_API_KEY present:", !!RESEND_API_KEY);
    console.log("[invite] FROM_EMAIL:", process.env.FROM_EMAIL);

    if (RESEND_API_KEY) {
      try {
      const expiresFormatted = new Date(invitation.expires_at).toLocaleDateString("ru-RU", {
        day: "numeric", month: "long", year: "numeric"
      });
      const companyName = company?.name ?? "Компания";
      const roleLabel = ROLE_LABELS[role] ?? role;
      const inviterName = inviterProfile?.full_name ?? "Администратор";
      const inviteUrl = `${SITE_URL}/invite/${invitation.token}`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #5B2ECC, #7C4AE8); padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .content { padding: 30px; }
    .highlight { background: #F8F6FF; border-left: 4px solid #5B2ECC; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .role-badge { display: inline-block; background: #ede9fe; color: #5B2ECC; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .btn { display: inline-block; background: #5B2ECC; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px; font-size: 15px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .expires { color: #999; font-size: 13px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Приглашение в команду</h1></div>
    <div class="content">
      <p>Здравствуйте${name?.trim() ? ", " + name.trim() : ""}!</p>
      <p>Вас приглашают присоединиться к команде работодателя на платформе <strong>FreedomHire</strong>.</p>
      <div class="highlight">
        <strong>Компания:</strong> ${companyName}<br>
        <strong>Роль:</strong> <span class="role-badge">${roleLabel}</span><br>
        <strong>Пригласил:</strong> ${inviterName}
      </div>
      <p>Нажмите кнопку ниже, чтобы принять приглашение:</p>
      <a href="${inviteUrl}" class="btn">Принять приглашение</a>
      <p class="expires">Ссылка действительна до ${expiresFormatted}. Если вы не ожидали этого письма — просто проигнорируйте его.</p>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} FreedomHIRE · freedomhire.uz</p></div>
  </div>
</body>
</html>`;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email.toLowerCase(),
            subject: `Приглашение в команду ${companyName} на FreedomHire`,
            html,
          }),
        });
        const resendJson = await resendRes.json();
        console.log("[invite] Resend status:", resendRes.status, JSON.stringify(resendJson));
      } catch (err: unknown) {
        console.error("[invite] Resend fetch error:", err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}