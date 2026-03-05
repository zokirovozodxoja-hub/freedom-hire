"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/context";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  description: string | null;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
  employment_type: string | null;
  work_format: string | null;
  experience_level: string | null;
  tags: string[] | null;
  company: { name: string | null; logo_url?: string | null }[] | null;
};

function formatSalary(
  from: number | null,
  to: number | null,
  fromFn: (v: string) => string,
  toFn: (v: string) => string
) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return null;
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return fromFn(fmt(from));
  return toFn(fmt(to!));
}

function daysSince(
  iso: string,
  todayStr: string,
  yesterdayStr: string,
  daysAgoFn: (d: number) => string,
  locale: string
) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return todayStr;
  if (days === 1) return yesterdayStr;
  if (days < 7) return daysAgoFn(days);
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000;
}

function stripHtml(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function JobsPage() {
  const { t, lang } = useI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [format, setFormat] = useState("");
  const [experience, setExperience] = useState("");

  const locale = lang === "uz" ? "uz-UZ" : "ru-RU";

  const formats = [
    { value: "", label: t.jobs.formats.any },
    { value: "office", label: t.jobs.formats.office },
    { value: "remote", label: t.jobs.formats.remote },
    { value: "hybrid", label: t.jobs.formats.hybrid },
  ];

  const experienceLevels = [
    { value: "", label: t.jobs.experienceLevels.any },
    { value: "no_experience", label: t.jobs.experienceLevels.no_experience },
    { value: "junior", label: t.jobs.experienceLevels.junior },
    { value: "middle", label: t.jobs.experienceLevels.middle },
    { value: "senior", label: t.jobs.experienceLevels.senior },
    { value: "lead", label: t.jobs.experienceLevels.lead },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("jobs")
      .select("id,title,city,description,created_at,salary_from,salary_to,employment_type,work_format,experience_level,tags,company:companies(name,logo_url)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (city) q = q.ilike("city", `%${city}%`);
    if (format) q = q.eq("work_format", format);
    if (experience) q = q.eq("experience_level", experience);

    const { data, error: dbErr } = await q;
    if (dbErr) { setDbError(dbErr.message); setLoading(false); return; }
    setDbError(null);
    let list = (data ?? []) as unknown as Job[];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (j) => j.title?.toLowerCase().includes(s) || j.description?.toLowerCase().includes(s)
      );
    }

    setJobs(list);
    setLoading(false);
  }, [search, city, format, experience]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      <div className="border-b" style={{ borderColor: "rgba(196,173,255,0.08)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="font-accent text-xs mb-2" style={{ color: "var(--lavender)" }}>{t.jobs.title}</div>
          <h1 className="font-display text-4xl sm:text-5xl" style={{ color: "var(--chalk)" }}>
            {t.jobs.allOffers}
          </h1>
          <p className="font-body text-white/40 mt-2 text-sm">
            {loading ? t.jobs.loading : t.jobs.jobsCount(jobs.length)}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ═══ FILTERS ═══ */}
          <aside className="lg:w-56 shrink-0 space-y-5">
            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t.jobs.search}</div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.jobs.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl font-body text-sm text-white placeholder-white/25 focus:outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
                />
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t.jobs.city}</div>
              <div className="flex flex-wrap gap-2">
                {t.common.cities.map((c) => {
                  const allCitiesLabel = t.common.cities[0];
                  const active = (c === allCitiesLabel && !city) || city === c;
                  return (
                    <button key={c} onClick={() => setCity(c === allCitiesLabel ? "" : c)}
                      className="px-3 py-1.5 rounded-xl text-xs font-body transition"
                      style={{
                        background: active ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.05)",
                        border: active ? "1px solid rgba(196,173,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: active ? "var(--lavender)" : "rgba(255,255,255,0.5)",
                      }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t.jobs.format}</div>
              <div className="space-y-1">
                {formats.map((f) => (
                  <button key={f.value} onClick={() => setFormat(f.value)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-body transition"
                    style={{
                      background: format === f.value ? "rgba(92,46,204,0.3)" : "transparent",
                      color: format === f.value ? "var(--lavender)" : "rgba(255,255,255,0.45)",
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t.jobs.experience}</div>
              <div className="space-y-1">
                {experienceLevels.map((e) => (
                  <button key={e.value} onClick={() => setExperience(e.value)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-body transition"
                    style={{
                      background: experience === e.value ? "rgba(92,46,204,0.3)" : "transparent",
                      color: experience === e.value ? "var(--lavender)" : "rgba(255,255,255,0.45)",
                    }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {(search || city || format || experience) && (
              <button onClick={() => { setSearch(""); setCity(""); setFormat(""); setExperience(""); }}
                className="w-full py-2 rounded-xl text-xs font-accent transition"
                style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                {t.jobs.resetFilters}
              </button>
            )}
          </aside>

          {/* ═══ JOB LIST ═══ */}
          <div className="flex-1">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="brand-card rounded-2xl h-36 animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="brand-card rounded-2xl p-12 text-center">
                <div className="mb-3 flex justify-center">
                  <svg className="w-10 h-10" style={{ color: "rgba(255,255,255,0.2)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="font-body text-white/40">{t.jobs.notFound}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const salary = formatSalary(job.salary_from, job.salary_to, t.common.salary.from, t.common.salary.to);
                  const empType = t.jobs.employmentTypes[job.employment_type as keyof typeof t.jobs.employmentTypes];
                  const expLevel = t.jobs.experienceLevels[job.experience_level as keyof typeof t.jobs.experienceLevels];
                  const wFormat = t.jobs.formats[job.work_format as keyof typeof t.jobs.formats];
                  const dateStr = daysSince(job.created_at, t.jobs.today, t.jobs.yesterday, t.jobs.daysAgo, locale);
                  const companyName = (job.company as any)?.[0]?.name;
                  const companyLogo = (job.company as any)?.[0]?.logo_url;
                  const descriptionText = stripHtml(job.description);

                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`}
                      className="brand-card rounded-2xl p-5 flex gap-4 items-start group transition-all hover:border-[rgba(196,173,255,0.25)] block">

                      {/* Логотип / аватар компании */}
                      <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-accent text-lg"
                        style={{
                          background: companyLogo ? undefined : "rgba(92,46,204,0.2)",
                          color: "var(--lavender)",
                          border: "1px solid rgba(92,46,204,0.3)",
                        }}>
                        {companyLogo ? (
                          <img src={companyLogo} alt={companyName ?? ""} className="w-full h-full object-cover" />
                        ) : (
                          (job.title ?? "?")[0].toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 min-w-0">

                        {/* Заголовок + дата */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h2 className="font-body font-semibold text-white text-base group-hover:text-[var(--lavender)] transition line-clamp-1">
                            {job.title ?? t.jobs.noTitle}
                          </h2>
                          <div className="flex items-center gap-2 shrink-0">
                            {isNew(job.created_at) && (
                              <span className="badge-new text-xs px-2 py-0.5 rounded-full font-accent">{t.common.new}</span>
                            )}
                            <span className="text-xs text-white/30 font-body">{dateStr}</span>
                          </div>
                        </div>

                        {/* Компания */}
                        {companyName && (
                          <div className="text-sm font-medium mb-2" style={{ color: "var(--lavender)" }}>
                            {companyName}
                          </div>
                        )}

                        {/* Зарплата — крупно */}
                        {salary && (
                          <div className="text-base font-bold mb-2" style={{ color: "var(--gold)" }}>
                            {salary} {t.jobs.sum}
                          </div>
                        )}

                        {/* Теги: город, формат, занятость, опыт */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {job.city && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-body px-2.5 py-1 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {job.city}
                            </span>
                          )}
                          {job.work_format && (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-body"
                              style={{ background: "rgba(196,173,255,0.1)", color: "var(--lavender)", border: "1px solid rgba(196,173,255,0.2)" }}>
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {wFormat ?? job.work_format}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-body"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {empType ?? job.employment_type}
                            </span>
                          )}
                          {job.experience_level && (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-body"
                              style={{ background: "rgba(92,46,204,0.12)", color: "#a78bfa", border: "1px solid rgba(92,46,204,0.2)" }}>
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {expLevel ?? job.experience_level}
                            </span>
                          )}
                        </div>

                        {/* Краткое описание */}
                        {descriptionText && (
                          <p className="text-sm font-body line-clamp-2 mb-2"
                            style={{ color: "rgba(255,255,255,0.45)" }}>
                            {descriptionText}
                          </p>
                        )}

                        {/* Теги */}
                        {job.tags && job.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {job.tags.slice(0, 5).map((tag) => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(124,58,237,0.12)", color: "#C4ADFF", border: "1px solid rgba(124,58,237,0.2)" }}>
                                {tag}
                              </span>
                            ))}
                            {job.tags.length > 5 && (
                              <span className="text-xs text-white/30">+{job.tags.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}