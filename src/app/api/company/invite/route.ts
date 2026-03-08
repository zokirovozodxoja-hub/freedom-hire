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

    // Кладём письмо в очередь
    await supabase.from("email_queue").insert({
      to_email: email.toLowerCase(),
      subject: `Приглашение в команду ${company?.name ?? "компании"} на FreedomHire`,
      template: "team_invite",
      template_data: {
        company_name: company?.name ?? "Компания",
        invited_name: name?.trim() || null,
        role_label: ROLE_LABELS[role] ?? role,
        inviter_name: inviterProfile?.full_name ?? "Администратор",
        token: invitation.token,
        expires_at: new Date(invitation.expires_at).toLocaleDateString("ru-RU", {
          day: "numeric", month: "long", year: "numeric"
        }),
      },
      status: "pending",
    });

    // Сразу триггерим отправку
    fetch(`${SITE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {}); // fire and forget

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}