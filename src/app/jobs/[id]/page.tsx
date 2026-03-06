import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ApplyButton from "./ApplyButton";
import JobViewTracker from "./JobViewTracker";

type Job = {
 id: string;
 title: string | null;
 city: string | null;
 description: string | null;
 requirements: string | null;
 responsibilities: string | null;
 benefits: string | null;
 created_at: string;
 salary_from: number | null;
 salary_to: number | null;
 salary_negotiable: boolean | null;
 is_active: boolean;
 employment_type: string | null;
 work_format: string | null;
 experience_level: string | null;
 education_level: string | null;
 tags: string[] | null;
 company: {
 id: string;
 name: string | null;
 description: string | null;
 city: string | null;
 website: string | null;
 industry: string | null;
 employees_count: string | null;
 logo_url: string | null;
 } | null;
};

function supabaseServer() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) return null;
 return createClient(url, key, { auth: { persistSession: false } });
}

function formatDate(iso: string) {
 return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatSalary(from: number | null, to: number | null, negotiable: boolean | null) {
 if (negotiable) return "По договорённости";
 const fmt = (n: number) => n.toLocaleString("ru-RU");
 if (!from && !to) return null;
 if (from && to) return `${fmt(from)} — ${fmt(to)} сум`;
 if (from) return `от ${fmt(from)} сум`;
 return `до ${fmt(to!)} сум`;
}

const FORMAT_LABELS: Record<string, string> = {
 office: "Офис", remote: "Удалённо", hybrid: "Гибрид",
};
const EMP_LABELS: Record<string, string> = {
 "full-time": "Полная занятость", "part-time": "Частичная занятость",
 contract: "Контракт", internship: "Стажировка",
};
const EXP_LABELS: Record<string, string> = {
 no_experience: "Без опыта", junior: "До 1 года", middle: "1–3 года",
 senior: "3–5 лет", lead: "5+ лет",
};
const EDU_LABELS: Record<string, string> = {
 school: "Среднее", college: "Среднее специальное", bachelor: "Бакалавр",
 master: "Магистр", phd: "PhD",
};

function parseList(text: string | null): string[] {
 if (!text) return [];
 return text.split("\n").map(l => l.replace(/^[-–—•*]\s*/, "").trim()).filter(Boolean);
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const supabase = supabaseServer();
 if (!supabase) notFound();

 const { data, error } = await supabase
 .from("jobs")
 .select(`
 id, title, city, description, requirements, responsibilities, benefits,
 created_at, salary_from, salary_to, salary_negotiable,
 is_active, employment_type, work_format, experience_level, education_level, tags,
 company:companies(id, name, description, city, website, industry, employees_count, logo_url)
 `)
 .eq("id", id)
 .maybeSingle();

 if (error || !data || data.is_active === false) notFound();

 const job = data as unknown as Job;
 const salary = formatSalary(job.salary_from, job.salary_to, job.salary_negotiable);
 const responsibilityList = parseList(job.responsibilities);
 const requirementsList = parseList(job.requirements);
 const benefitsList = parseList(job.benefits);

 return (
 <div className="min-h-screen" style={{ background: "var(--bg, #07060F)", color: "#fff" }}>
 <JobViewTracker jobId={job.id} />
 <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">

 {/* Назад */}
 <Link href="/jobs" className="inline-flex items-center gap-1 text-sm mb-6"
 style={{ color: "#C4ADFF" }}>
 ← Все вакансии
 </Link>

 <div className="grid lg:grid-cols-3 gap-6">

 {/* ═══ ОСНОВНОЙ КОНТЕНТ ═══ */}
 <div className="lg:col-span-2 space-y-5">

 {/* Шапка */}
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}>
 <div className="flex items-start gap-4">
 <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden flex items-center justify-center text-xl font-bold"
                  style={{ background: job.company?.logo_url ? "white" : "rgba(92,46,204,0.25)", color: "#C4ADFF", border: "1px solid rgba(92,46,204,0.3)" }}>
                  {job.company?.logo_url ? (
                    <img src={job.company.logo_url} alt={job.company.name || ""} className="w-full h-full object-contain p-1.5" />
                  ) : (
                    (job.company?.name ?? job.title ?? "?")[0].toUpperCase()
                  )}
                </div>
 <div className="flex-1">
 <h1 className="text-2xl font-bold leading-tight">{job.title ?? "Без названия"}</h1>
 {job.company?.name && (
 <Link href={`/companies/${job.company.id}`} className="mt-1 text-sm font-medium hover:underline inline-block" style={{ color: "#C4ADFF" }}>
 {job.company.name}
 </Link>
 )}
 <div className="mt-2 flex flex-wrap gap-3 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
 {job.city && <span>{job.city}</span>}
 <span>{formatDate(job.created_at)}</span>
 </div>
 </div>
 </div>

 {/* Теги условий */}
 <div className="mt-4 flex flex-wrap gap-2">
 {salary && (
 <span className="px-3 py-1.5 rounded-full text-sm font-semibold"
 style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.3)" }}>
 {salary}
 </span>
 )}
 {job.work_format && (
 <span className="px-3 py-1.5 rounded-full text-sm"
 style={{ background: "rgba(196,173,255,0.1)", color: "#C4ADFF", border: "1px solid rgba(196,173,255,0.2)" }}>
 {FORMAT_LABELS[job.work_format] ?? job.work_format}
 </span>
 )}
 {job.employment_type && (
 <span className="px-3 py-1.5 rounded-full text-sm"
 style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
 {EMP_LABELS[job.employment_type] ?? job.employment_type}
 </span>
 )}
 {job.experience_level && (
 <span className="px-3 py-1.5 rounded-full text-sm"
 style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
 {EXP_LABELS[job.experience_level] ?? job.experience_level}
 </span>
 )}
 {job.education_level && (
 <span className="px-3 py-1.5 rounded-full text-sm"
 style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
 {EDU_LABELS[job.education_level] ?? job.education_level}
 </span>
 )}
 </div>
 </div>

 {/* Описание */}
 {job.description && (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-3 text-lg">О вакансии</h2>
 <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
 {job.description}
 </p>
 </div>
 )}

 {/* Обязанности */}
 {responsibilityList.length > 0 && (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-4 text-lg">Обязанности</h2>
 <ul className="space-y-3">
 {responsibilityList.map((item, i) => (
 <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
 <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C4ADFF" }} />
 <span className="flex-1">{item}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Требования */}
 {requirementsList.length > 0 ? (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-4 text-lg">Требования</h2>
 <ul className="space-y-3">
 {requirementsList.map((item, i) => (
 <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
 <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#C4ADFF" }} />
 <span className="flex-1">{item}</span>
 </li>
 ))}
 </ul>
 </div>
 ) : job.requirements && (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-3 text-lg">Требования</h2>
 <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
 {job.requirements}
 </p>
 </div>
 )}

 {/* Бенефиты */}
 {benefitsList.length > 0 ? (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-4 text-lg">Условия и бенефиты</h2>
 <ul className="space-y-3">
 {benefitsList.map((item, i) => (
 <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
 <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#4ade80" }} />
 <span className="flex-1">{item}</span>
 </li>
 ))}
 </ul>
 </div>
 ) : job.benefits && (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-3 text-lg">Условия</h2>
 <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
 {job.benefits}
 </p>
 </div>
 )}

 {/* Теги/навыки */}
 {job.tags && job.tags.length > 0 && (
 <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h2 className="font-semibold mb-3 text-lg">Навыки и технологии</h2>
 <div className="flex flex-wrap gap-2">
 {job.tags.map((tag) => (
 <span key={tag} className="px-3 py-1 rounded-full text-sm"
 style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#C4ADFF" }}>
 {tag}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* ═══ САЙДБАР ═══ */}
 <div className="space-y-4">

 {/* Кнопка отклика */}
 <div className="rounded-2xl p-5" style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.3)" }}>
 <ApplyButton jobId={job.id} />
 </div>

 {/* О компании - КЛИКАБЕЛЬНАЯ КАРТОЧКА */}
 {job.company && (
 <Link href={`/companies/${job.company.id}`} className="block rounded-2xl p-5 transition-all hover:scale-[1.02]" 
 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h3 className="font-semibold mb-3 flex items-center justify-between">
 <span>О компании</span>
 <span className="text-xs" style={{ color: "#C4ADFF" }}>Подробнее →</span>
 </h3>
 {job.company.logo_url ? (
 <img 
 src={job.company.logo_url} 
 alt={job.company.name || "Company logo"}
 className="h-12 w-12 rounded-xl object-cover mb-3"
 />
 ) : (
 <div className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold mb-3"
 style={{ background: "rgba(92,46,204,0.2)", color: "#C4ADFF" }}>
 {(job.company.name ?? "?")[0].toUpperCase()}
 </div>
 )}
 <div className="font-medium text-white">{job.company.name}</div>
 {job.company.industry && (
 <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
 {job.company.industry}
 </div>
 )}
 {job.company.city && (
 <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
 {job.company.city}
 </div>
 )}
 {job.company.employees_count && (
 <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
 {job.company.employees_count} сотрудников
 </div>
 )}
 {job.company.description && (
 <p className="text-sm mt-3 leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.6)" }}>
 {job.company.description}
 </p>
 )}
 {job.company.website && (
 <div className="mt-3 text-sm" style={{ color: "#C4ADFF" }}>
 Сайт компании
 </div>
 )}
 </Link>
 )}

 {/* Детали */}
 <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <h3 className="font-semibold mb-3">Детали вакансии</h3>
 <div className="space-y-3 text-sm">
 {job.city && (
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Город</span>
 <span className="text-white font-medium">{job.city}</span>
 </div>
 )}
 {job.work_format && (
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Формат работы</span>
 <span className="text-white font-medium">{FORMAT_LABELS[job.work_format] ?? job.work_format}</span>
 </div>
 )}
 {job.employment_type && (
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Тип занятости</span>
 <span className="text-white font-medium">{EMP_LABELS[job.employment_type] ?? job.employment_type}</span>
 </div>
 )}
 {job.experience_level && (
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Требуемый опыт</span>
 <span className="text-white font-medium">{EXP_LABELS[job.experience_level] ?? job.experience_level}</span>
 </div>
 )}
 {job.education_level && (
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Образование</span>
 <span className="text-white font-medium">{EDU_LABELS[job.education_level] ?? job.education_level}</span>
 </div>
 )}
 <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
 <div className="flex justify-between items-center">
 <span style={{ color: "rgba(255,255,255,0.6)" }}>Опубликовано</span>
 <span className="text-white font-medium">{formatDate(job.created_at)}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 </div>
 </div>
 </div>
 );
}