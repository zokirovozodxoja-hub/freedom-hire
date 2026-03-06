import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type Company = {
  id: string;
  name: string | null;
  description: string | null;
  city: string | null;
  website: string | null;
  industry: string | null;
  employees_count: string | null;
  created_at: string;
};

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  salary_from: number | null;
  salary_to: number | null;
  salary_negotiable: boolean | null;
  work_format: string | null;
  employment_type: string | null;
  created_at: string;
};

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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
  "full-time": "Полная", "part-time": "Частичная",
  contract: "Контракт", internship: "Стажировка",
};

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseServer();
  if (!supabase) notFound();

  // Загружаем информацию о компании
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (companyError || !company) notFound();

  // Загружаем активные вакансии компании
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, city, salary_from, salary_to, salary_negotiable, work_format, employment_type, created_at")
    .eq("company_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const companyData = company as Company;
  const jobsList = (jobs || []) as Job[];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg, #07060F)", color: "#fff" }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">

        {/* Назад */}
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: "#C4ADFF" }}>
          ← Все вакансии
        </Link>

        {/* Шапка компании */}
        <div className="rounded-2xl p-8 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,173,255,0.12)" }}>
          <div className="flex items-start gap-6">
            {/* Логотип */}
            <div className="h-24 w-24 shrink-0 rounded-2xl flex items-center justify-center text-3xl font-bold"
              style={{ background: "rgba(92,46,204,0.25)", color: "#C4ADFF", border: "2px solid rgba(92,46,204,0.4)" }}>
              {(companyData.name ?? "?")[0].toUpperCase()}
            </div>

            {/* Информация */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{companyData.name ?? "Компания"}</h1>
              
              {companyData.industry && (
                <div className="text-sm mb-3" style={{ color: "#C4ADFF" }}>
                  {companyData.industry}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                {companyData.city && (
                  <span>{companyData.city}</span>
                )}
                {companyData.employees_count && (
                  <span>{companyData.employees_count} сотрудников</span>
                )}
                {companyData.website && (
                  <a href={companyData.website} target="_blank" rel="noopener noreferrer"
                    className="hover:underline" style={{ color: "#C4ADFF" }}>
                    Сайт компании
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Описание */}
          {companyData.description && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <h2 className="font-semibold mb-3 text-lg">О компании</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
                {companyData.description}
              </p>
            </div>
          )}
        </div>

        {/* Вакансии компании */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Открытые вакансии
            {jobsList.length > 0 && (
              <span className="text-base font-normal ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                ({jobsList.length})
              </span>
            )}
          </h2>

          {jobsList.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                В данный момент нет открытых вакансий
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobsList.map((job) => {
                const salary = formatSalary(job.salary_from, job.salary_to, job.salary_negotiable);
                const timeAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`}
                    className="block rounded-2xl p-5 transition-all hover:scale-[1.01]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{job.title ?? "Вакансия"}</h3>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {salary && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.3)" }}>
                              {salary}
                            </span>
                          )}
                          {job.city && (
                            <span className="px-2.5 py-1 rounded-full text-xs"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                              {job.city}
                            </span>
                          )}
                          {job.work_format && (
                            <span className="px-2.5 py-1 rounded-full text-xs"
                              style={{ background: "rgba(196,173,255,0.1)", color: "#C4ADFF", border: "1px solid rgba(196,173,255,0.2)" }}>
                              {FORMAT_LABELS[job.work_format] ?? job.work_format}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="px-2.5 py-1 rounded-full text-xs"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                              {EMP_LABELS[job.employment_type] ?? job.employment_type}
                            </span>
                          )}
                        </div>

                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {timeAgo === 0 ? "Сегодня" : timeAgo === 1 ? "Вчера" : `${timeAgo} дней назад`}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="text-sm font-medium" style={{ color: "#C4ADFF" }}>
                          Подробнее →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
