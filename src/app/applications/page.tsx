"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Application = {
 id: string;
 job_id: string;
 status: string | null;
 cover_letter: string | null;
 created_at: string;
 jobs: {
 title: string | null;
 city: string | null;
 salary_from: number | null;
 salary_to: number | null;
 companies: { name: string | null } | null;
 } | null;
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
 sent: { label: "Отправлен", cls: "bg-blue-500/20 text-blue-400" },
 applied: { label: "Отправлен", cls: "bg-blue-500/20 text-blue-400" },
 viewed: { label: "Просмотрен", cls: "bg-yellow-500/20 text-yellow-400" },
 in_progress: { label: "В процессе", cls: "bg-violet-500/20 text-violet-400" },
 shortlisted: { label: "Шортлист", cls: "bg-violet-500/20 text-violet-400" },
 invited: { label: "Приглашение", cls: "bg-emerald-500/20 text-emerald-400" },
 accepted: { label: "Принят", cls: "bg-emerald-500/20 text-emerald-400" },
 rejected: { label: "Отказ", cls: "bg-red-500/20 text-red-400" },
};

function formatDate(iso: string) {
 return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function formatSalary(from: number | null, to: number | null) {
 if (!from && !to) return null;
 const f = (n: number) => n.toLocaleString("ru-RU");
 if (from && to) return `${f(from)} – ${f(to)}`;
 if (from) return `от ${f(from)}`;
 return `до ${f(to!)}`;
}

export default function ApplicationsPage() {
 const router = useRouter();
 const supabase = useMemo(() => createClient(), []);
 const [loading, setLoading] = useState(true);
 const [apps, setApps] = useState<Application[]>([]);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 (async () => {
 const { data: userData } = await supabase.auth.getUser();
 if (!userData.user) { router.replace("/auth"); return; }

 const { data, error } = await supabase
 .from("applications")
 .select(`
 id, job_id, status, cover_letter, created_at,
 jobs (
 title, city, salary_from, salary_to,
 companies ( name )
 )
 `)
 .eq("candidate_id", userData.user.id)
 .order("created_at", { ascending: false });

 if (error) setError(error.message);
 setApps((data ?? []) as unknown as Application[]);
 setLoading(false);
 })();
 }, [router, supabase]);

 if (loading) {
 return (
 <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
 Загрузка...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#0b1220] text-white p-6">
 <div className="max-w-3xl mx-auto">
 <div className="flex items-center justify-between gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-semibold">Мои отклики</h1>
 <p className="text-white/50 text-sm mt-1">{apps.length} откликов</p>
 </div>
 <Link
 href="/resume"
 className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
 >
 ← Профиль
 </Link>
 </div>

 {error && (
 <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
 {error}
 </div>
 )}

 {apps.length === 0 ? (
 <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
 <div className="text-4xl mb-4"></div>
 <div className="text-white/70 font-medium">Откликов пока нет</div>
 <div className="text-white/40 text-sm mt-2">Найдите подходящие вакансии и откликнитесь</div>
 <Link
 href="/jobs"
 className="mt-4 inline-block rounded-2xl bg-[#7c3aed] px-5 py-2 text-sm font-semibold hover:bg-[#6d28d9] transition"
 >
 Смотреть вакансии
 </Link>
 </div>
 ) : (
 <div className="space-y-3">
 {apps.map((app) => {
 const statusInfo = STATUS_MAP[app.status ?? "sent"] ?? STATUS_MAP.sent;
 const salary = formatSalary(app.jobs?.salary_from ?? null, app.jobs?.salary_to ?? null);

 return (
 <div key={app.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <Link
 href={`/jobs/${app.job_id}`}
 className="font-semibold hover:text-violet-400 transition truncate block"
 >
 {app.jobs?.title ?? "Вакансия удалена"}
 </Link>
 <div className="text-sm text-white/50 mt-1">
 {app.jobs?.companies?.name && <span>{app.jobs.companies.name} · </span>}
 {app.jobs?.city && <span>{app.jobs.city}</span>}
 {salary && <span> · {salary}</span>}
 </div>
 </div>
 <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.cls}`}>
 {statusInfo.label}
 </span>
 </div>

 {app.cover_letter && (
 <div className="mt-3 text-sm text-white/50 bg-black/20 rounded-xl px-4 py-3 line-clamp-2">
 {app.cover_letter}
 </div>
 )}

 <div className="mt-2 text-xs text-white/30">
 Отправлен {formatDate(app.created_at)}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
