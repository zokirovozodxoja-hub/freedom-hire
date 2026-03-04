"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  slogan: string | null;
  about: string | null;
  industry: string | null;
  employee_count: string | null;
  founded_year: number | null;
  website: string | null;
  telegram: string | null;
  instagram: string | null;
  city: string | null;
  is_premium: boolean;
  verification_status: string | null;
};

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  work_format: string | null;
  employment_type: string | null;
  salary_from: number | null;
  salary_to: number | null;
  salary_negotiable: boolean | null;
  created_at: string;
};

const FORMAT_LABELS: Record<string, string> = {
  office: "Офис",
  remote: "Удалённо",
  hybrid: "Гибрид",
};

const EMP_LABELS: Record<string, string> = {
  "full-time": "Полная занятость",
  "part-time": "Частичная",
  contract: "Контракт",
  internship: "Стажировка",
};

function formatSalary(from: number | null, to: number | null, negotiable: boolean | null) {
  if (negotiable) return "По договорённости";
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return null;
  if (from && to) return `${fmt(from)} — ${fmt(to)} сум`;
  if (from) return `от ${fmt(from)} сум`;
  return `до ${fmt(to!)} сум`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function CompanyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Ищем компанию по slug или id
      let query = supabase
        .from("companies")
        .select("*")
        .eq("verification_status", "verified");

      // Проверяем, это slug или uuid
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      
      if (isUuid) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data: comp } = await query.maybeSingle();

      if (!comp) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCompany(comp as Company);

      // Загружаем вакансии компании
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, city, work_format, employment_type, salary_from, salary_to, salary_negotiable, created_at")
        .eq("company_id", comp.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setJobs((jobsData ?? []) as Job[]);
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--chalk)" }}>Компания не найдена</h1>
          <p className="mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
            Возможно, страница была удалена или компания ещё не верифицирована
          </p>
          <Link href="/jobs" className="btn-primary rounded-xl px-6 py-3 font-semibold text-white">
            Смотреть вакансии
          </Link>
        </div>
      </div>
    );
  }

  const initials = (company.name ?? "C")[0].toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80">
        {company.banner_url ? (
          <img 
            src={company.banner_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ 
            background: "linear-gradient(135deg, #5B2ECC 0%, #7C4AE8 50%, #9D6EF0 100%)" 
          }} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ 
          background: "linear-gradient(to top, var(--bg) 0%, transparent 50%)" 
        }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Company header */}
        <div className="relative -mt-16 sm:-mt-20 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 shrink-0"
              style={{ 
                borderColor: "var(--bg)",
                background: company.logo_url ? "white" : "linear-gradient(135deg, #5B2ECC, #7C4AE8)",
              }}>
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name ?? ""} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-2 sm:pt-8">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--chalk)" }}>
                  {company.name}
                </h1>
                {company.verification_status === "verified" && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
                    ✓ Верифицирована
                  </span>
                )}
              </div>

              {company.slogan && (
                <p className="mt-2 text-lg" style={{ color: "var(--lavender)" }}>
                  {company.slogan}
                </p>
              )}

              {/* Meta info */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                {company.industry && (
                  <span>🏷️ {company.industry}</span>
                )}
                {company.city && (
                  <span>📍 {company.city}</span>
                )}
                {company.employee_count && (
                  <span>👥 {company.employee_count} сотрудников</span>
                )}
                {company.founded_year && (
                  <span>📅 С {company.founded_year} года</span>
                )}
              </div>

              {/* Links */}
              <div className="mt-4 flex flex-wrap gap-2">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)" }}>
                    🌐 Сайт
                  </a>
                )}
                {company.telegram && (
                  <a href={`https://t.me/${company.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)" }}>
                    📱 Telegram
                  </a>
                )}
                {company.instagram && (
                  <a href={`https://instagram.com/${company.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)" }}>
                    📸 Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {company.about && (
          <div className="mb-8 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--chalk)" }}>О компании</h2>
            <p className="whitespace-pre-line" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
              {company.about}
            </p>
          </div>
        )}

        {/* Jobs */}
        <div className="pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--chalk)" }}>
              Вакансии ({jobs.length})
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-4xl mb-3">📭</div>
              <p style={{ color: "rgba(255,255,255,0.5)" }}>Пока нет открытых вакансий</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => {
                const salary = formatSalary(job.salary_from, job.salary_to, job.salary_negotiable);
                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-2xl p-5 transition hover:scale-[1.01]"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--chalk)" }}>
                          {job.title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {job.city && (
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                              📍 {job.city}
                            </span>
                          )}
                          {job.work_format && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(92,46,204,0.15)", color: "var(--lavender)" }}>
                              {FORMAT_LABELS[job.work_format] || job.work_format}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                              {EMP_LABELS[job.employment_type] || job.employment_type}
                            </span>
                          )}
                        </div>

                        {salary && (
                          <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
                            {salary}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {timeAgo(job.created_at)}
                        </span>
                        <div className="mt-2">
                          <span className="text-sm" style={{ color: "var(--lavender)" }}>
                            Подробнее →
                          </span>
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

      {/* Footer - Powered by */}
      {!company.is_premium && (
        <div className="fixed bottom-0 left-0 right-0 py-3 text-center text-xs"
          style={{ background: "rgba(7,6,15,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
          Powered by <Link href="/" className="font-semibold" style={{ color: "var(--lavender)" }}>FreedomHIRE</Link>
        </div>
      )}
    </div>
  );
}
