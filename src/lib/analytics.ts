import { createClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════════
// АНАЛИТИКА ПРОСМОТРОВ
// ═══════════════════════════════════════════════════════════════════

export type JobViewStats = {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byDay: { date: string; count: number }[];
};

export type ProfileViewStats = {
  total: number;
  thisWeek: number;
  viewers: {
    id: string;
    name: string | null;
    company: string | null;
    viewedAt: string;
  }[];
};

// Записать просмотр вакансии
export async function trackJobView(jobId: string): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  await supabase.from("job_views").insert({
    job_id: jobId,
    viewer_id: userData.user?.id ?? null,
  });
}

// Записать просмотр профиля кандидата
export async function trackProfileView(profileId: string): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) return; // Только авторизованные
  
  // Получаем company_id работодателя
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  
  await supabase.from("profile_views").insert({
    profile_id: profileId,
    viewer_id: userData.user.id,
    viewer_company_id: company?.id ?? null,
  });
}

// Получить статистику просмотров вакансии (для работодателя)
export async function getJobViewStats(jobId: string): Promise<JobViewStats> {
  const supabase = createClient();
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  // Общее количество
  const { count: total } = await supabase
    .from("job_views")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId);
  
  // Сегодня
  const { count: today } = await supabase
    .from("job_views")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .gte("created_at", todayStart);
  
  // За неделю
  const { count: thisWeek } = await supabase
    .from("job_views")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .gte("created_at", weekStart);
  
  // За месяц
  const { count: thisMonth } = await supabase
    .from("job_views")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .gte("created_at", monthStart);
  
  // По дням за последние 14 дней
  const { data: viewsData } = await supabase
    .from("job_views")
    .select("created_at")
    .eq("job_id", jobId)
    .gte("created_at", new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });
  
  // Группируем по дням
  const byDayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    byDayMap.set(key, 0);
  }
  
  for (const v of viewsData ?? []) {
    const key = v.created_at.split("T")[0];
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
  }
  
  const byDay = Array.from(byDayMap.entries()).map(([date, count]) => ({ date, count }));
  
  return {
    total: total ?? 0,
    today: today ?? 0,
    thisWeek: thisWeek ?? 0,
    thisMonth: thisMonth ?? 0,
    byDay,
  };
}

// Получить статистику всех вакансий работодателя
export async function getEmployerJobsStats(): Promise<{
  jobId: string;
  title: string;
  views: number;
  applications: number;
}[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  
  // Получаем компанию
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  
  if (!company) return [];
  
  // Получаем вакансии с подсчётами
  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      job_views(count),
      applications(count)
    `)
    .eq("company_id", company.id)
    .eq("is_active", true);
  
  return (jobs ?? []).map((j: any) => ({
    jobId: j.id,
    title: j.title ?? "Без названия",
    views: j.job_views?.[0]?.count ?? 0,
    applications: j.applications?.[0]?.count ?? 0,
  }));
}

// Получить кто смотрел профиль кандидата
export async function getProfileViewers(): Promise<ProfileViewStats> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { total: 0, thisWeek: 0, viewers: [] };
  
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Общее количество
  const { count: total } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userData.user.id);
  
  // За неделю
  const { count: thisWeek } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userData.user.id)
    .gte("created_at", weekStart);
  
  // Последние просмотры с данными
  const { data: views } = await supabase
    .from("profile_views")
    .select(`
      created_at,
      viewer:profiles!viewer_id(full_name),
      company:companies!viewer_company_id(name)
    `)
    .eq("profile_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  
  const viewers = (views ?? []).map((v: any) => ({
    id: v.viewer_id,
    name: v.viewer?.full_name ?? null,
    company: v.company?.name ?? null,
    viewedAt: v.created_at,
  }));
  
  return {
    total: total ?? 0,
    thisWeek: thisWeek ?? 0,
    viewers,
  };
}
