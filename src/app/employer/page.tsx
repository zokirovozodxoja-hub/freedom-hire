"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Company = {
 id: string;
 name: string | null;
 verification_status: string | null;
};

type Stats = {
 jobs: number;
 activeJobs: number;
 applications: number;
};

export default function EmployerDashboard() {
 const router = useRouter();
 const supabase = useMemo(() => createClient(), []);

 const [loading, setLoading] = useState(true);
 const [company, setCompany] = useState<Company | null>(null);
 const [stats, setStats] = useState<Stats>({ jobs: 0, activeJobs: 0, applications: 0 });

 useEffect(() => {
 (async () => {
 const { data: userData } = await supabase.auth.getUser();
 if (!userData.user) { router.replace("/auth"); return; }

 const { data: comp } = await supabase
 .from("companies")
 .select("id,name,verification_status")
 .eq("owner_id", userData.user.id)
 .maybeSingle();

 if (!comp) {
 router.replace("/onboarding/employer");
 return;
 }

 setCompany(comp);

 // Получаем ID всех вакансий компании
 const { data: jobIds } = await supabase
 .from("jobs")
 .select("id")
 .eq("company_id", comp.id);

 const ids = (jobIds ?? []).map((j) => j.id);

 const [jobsRes, activeRes, appsRes] = await Promise.all([
 supabase.from("jobs")
 .select("id", { count: "exact", head: true })
 .eq("company_id", comp.id),
 supabase.from("jobs")
 .select("id", { count: "exact", head: true })
 .eq("company_id", comp.id)
 .eq("is_active", true),
 // Считаем отклики только на вакансии этой компании
 ids.length > 0
 ? supabase.from("applications")
 .select("id", { count: "exact", head: true })
 .in("job_id", ids)
 : Promise.resolve({ count: 0 }),
 ]);

 setStats({
 jobs: jobsRes.count ?? 0,
 activeJobs: activeRes.count ?? 0,
 applications: appsRes.count ?? 0,
 });

 setLoading(false);
 })();
 }, [router, supabase]);

 async function handleLogout() {
 await supabase.auth.signOut();
 router.replace("/");
 }

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
          <div className="text-sm font-body" style={{ color: "rgba(255,255,255,0.3)" }}>Загрузка...</div>
        </div>
      </div>
 );
 }

 const verStatus = company?.verification_status;
 const verBadge =
 verStatus === "approved"
 ? { label: "Верифицирована ", cls: "bg-emerald-500/20 text-emerald-400" }
 : verStatus === "pending"
 ? { label: "На проверке...", cls: "bg-yellow-500/20 text-yellow-400" }
 : { label: "Не верифицирована", cls: "bg-white/10 text-white/50" };

 return (
 <div className="min-h-screen text-white p-6" style={{ background: "var(--ink)" }}>
 <div className="max-w-5xl mx-auto">

 {/* Шапка */}
 <div className="flex items-start justify-between gap-4 mb-8">
 <div>
 <h1 className="text-2xl font-semibold">Кабинет работодателя</h1>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-white/70">{company?.name}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verBadge.cls}`}>
 {verBadge.label}
 </span>
 </div>
 </div>
 <button
 onClick={handleLogout}
 className="text-sm text-white/50 hover:text-white transition px-4 py-2 rounded-xl hover:bg-white/5"
 >
 Выйти
 </button>
 </div>

 {/* Статистика */}
 <div className="grid grid-cols-3 gap-4 mb-8">
 {[
 { label: "Всего вакансий", value: stats.jobs, color: "from-violet-600/20" },
 { label: "Активных", value: stats.activeJobs, color: "from-emerald-600/20" },
 { label: "Откликов", value: stats.applications, color: "from-blue-600/20" },
 ].map((s) => (
 <div key={s.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${s.color} to-transparent p-5`}>
 <div className="text-3xl font-bold">{s.value}</div>
 <div className="text-sm text-white/60 mt-1">{s.label}</div>
 </div>
 ))}
 </div>

 {/* Быстрые действия */}
 <div className="grid md:grid-cols-2 gap-4">
 <Link
 href="/employer/jobs/new"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
 </div>
 <div className="font-semibold text-lg">Создать вакансию</div>
 <div className="text-sm text-white/50 mt-1">Разместите новую вакансию для поиска кандидатов</div>
 </Link>

 <Link
 href="/employer/jobs"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
 </div>
 <div className="font-semibold text-lg">Мои вакансии</div>
 <div className="text-sm text-white/50 mt-1">
 {stats.jobs > 0 ? `${stats.jobs} вакансий, ${stats.activeJobs} активных` : "Вакансий пока нет"}
 </div>
 </Link>

 <Link
 href="/employer/applications"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
 </div>
 <div className="font-semibold text-lg">Отклики</div>
 <div className="text-sm text-white/50 mt-1">
 {stats.applications > 0 ? `${stats.applications} откликов` : "Откликов пока нет"}
 </div>
 </Link>

 <Link
 href="/employer/analytics"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
 </div>
 <div className="font-semibold text-lg">Аналитика</div>
 <div className="text-sm text-white/50 mt-1">Просмотры вакансий и конверсия</div>
 </Link>

 <Link
 href="/chat"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
 </div>
 <div className="font-semibold text-lg">Сообщения</div>
 <div className="text-sm text-white/50 mt-1">Чат с кандидатами</div>
 </Link>

 <Link
 href="/employer/company"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
 </div>
 <div className="font-semibold text-lg">Страница компании</div>
 <div className="text-sm text-white/50 mt-1">Баннер, логотип, описание</div>
 </Link>

 <Link
 href="/employer/team"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
 </div>
 <div className="font-semibold text-lg">Команда</div>
 <div className="text-sm text-white/50 mt-1">Сотрудники, роли, приглашения</div>
 </Link>

 <Link
 href="/employer/interviews"
 className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}>
 <svg className="w-5 h-5" style={{ color: "#34d399" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}/></svg>
 </div>
 <div className="font-semibold text-lg">Интервью</div>
 <div className="text-sm text-white/50 mt-1">Календарь собеседований</div>
 </Link>
 </div>

 {verStatus === "pending" && (
 <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
 Ваша компания находится на проверке. Это обычно занимает до 24 часов. После верификации вы сможете публиковать вакансии.
 </div>
 )}
 </div>
 </div>
 );
}