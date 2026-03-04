import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Админские email'ы (должны совпадать с теми что в коде)
const ADMIN_EMAILS = ["zokirovozodxoja@gmail.com"];

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Создаём клиент с service_role для доступа к auth.admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Проверяем что запрос от админа
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requester?.email || !ADMIN_EMAILS.includes(requester.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Удаляем связанные данные
    await Promise.all([
      supabaseAdmin.from("candidate_experiences").delete().eq("profile_id", userId),
      supabaseAdmin.from("candidate_skills").delete().eq("user_id", userId),
      supabaseAdmin.from("applications").delete().eq("candidate_id", userId),
      supabaseAdmin.from("saved_jobs").delete().eq("user_id", userId),
      supabaseAdmin.from("messages").delete().eq("sender_id", userId),
      supabaseAdmin.from("conversations").delete().or(`employer_id.eq.${userId},candidate_id.eq.${userId}`),
      supabaseAdmin.from("job_views").delete().eq("viewer_id", userId),
      supabaseAdmin.from("profile_views").delete().or(`profile_id.eq.${userId},viewer_id.eq.${userId}`),
      supabaseAdmin.from("notification_settings").delete().eq("user_id", userId),
    ]);

    // Удаляем профиль
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Profile delete error:", profileError);
    }

    // Удаляем пользователя из auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      return NextResponse.json(
        { error: "Failed to delete auth user: " + authDeleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
