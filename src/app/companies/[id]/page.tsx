import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type Company = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  about: string | null;
  slogan: string | null;
  city: string | null;
  website: string | null;
  industry: string | null;
  employees_count: string | null;
  employee_count: string | null;
  logo_url: string | null;
  banner_url: string | null;
  founded_year: number | null;
  telegram: string | null;
  instagram: string | null;
  is_premium: boolean | null;
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

function timeAgoLabel(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  return `${days} дней назад`;
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (companyError || !company) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, city, salary_from, salary_to, salary_negotiable, work_format, employment_type, created_at")
    .eq("company_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const c = company as Company;
  const jobsList = (jobs || []) as Job[];
  const employeeCount = c.employee_count ?? c.employees_count;
  const aboutText = c.about ?? c.description;

  return (
    <div className="min-h-screen" style={{ background: "var(--ink)", color: "#fff" }}>
      <style>{`
        .job-card-hover { transition: background 0.2s, border-color 0.2s; }
        .job-card-hover:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(196,173,255,0.25) !important; }
      `}</style>

      {/* ══════════════════════════════════
          BANNER
      ══════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ height: "280px" }}>
        {c.banner_url ? (
          <img
            src={c.banner_url}
            alt="Баннер компании"
            className="w-full h-full object-cover"
          />
        ) : (
          /* Default gradient banner */
          <div
            className="w-full h-full"
            style={{
              background: "linear-gradient(135deg, #3D14BB 0%, #5B2ECC 40%, #7C4AE8 70%, #1E0F44 100%)",
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(196,173,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196,173,255,0.06) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
            {/* Glow orbs */}
            <div
              className="absolute"
              style={{
                width: 400, height: 400, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,74,232,0.5) 0%, transparent 70%)",
                top: -100, left: -80,
              }}
            />
            <div
              className="absolute"
              style={{
                width: 300, height: 300, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(196,173,255,0.25) 0%, transparent 70%)",
                bottom: -80, right: 100,
              }}
            />
          </div>
        )}

        {/* Dark gradient at bottom so logo/text is readable */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "60%",
            background: "linear-gradient(to top, rgba(10,6,24,0.85) 0%, transparent 100%)",
          }}
        />

        {/* Premium badge */}
        {c.is_premium && (
          <div
            className="absolute top-5 right-5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(201,168,76,0.2)",
              border: "1px solid rgba(201,168,76,0.5)",
              color: "var(--gold)",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Premium
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          COMPANY HEADER (overlaps banner)
      ══════════════════════════════════ */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Logo + name row — pulled up over the banner */}
        <div className="flex items-end gap-5 -mt-14 mb-6 relative z-10">
          {/* Logo */}
          <div
            className="shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold"
            style={{
              width: 96, height: 96,
              background: c.logo_url ? "white" : "linear-gradient(135deg, #5B2ECC, #7C4AE8)",
              border: "3px solid rgba(10,6,24,1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              color: "#C4ADFF",
            }}
          >
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.name ?? "logo"} className="w-full h-full object-contain p-2" />
            ) : (
              (c.name ?? "?")[0].toUpperCase()
            )}
          </div>

          {/* Name + slogan */}
          <div className="pb-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "var(--chalk)" }}>
              {c.name ?? "Компания"}
            </h1>
            {c.slogan && (
              <p className="text-sm mt-0.5" style={{ color: "var(--lavender)" }}>
                {c.slogan}
              </p>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            META CHIPS ROW
        ══════════════════════════════════ */}
        <div className="flex flex-wrap gap-3 mb-8">
          {c.industry && (
            <span
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(92,46,204,0.18)",
                border: "1px solid rgba(196,173,255,0.2)",
                color: "var(--lavender)",
              }}
            >
              {c.industry}
            </span>
          )}
          {c.city && (
            <span
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              {c.city}
            </span>
          )}
          {employeeCount && (
            <span
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              {employeeCount} сотрудников
            </span>
          )}
          {c.founded_year && (
            <span
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              Основана в {c.founded_year}
            </span>
          )}
        </div>

        {/* ══════════════════════════════════
            TWO COLUMN LAYOUT
        ══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* LEFT — About + Jobs */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            {aboutText && (
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(196,173,255,0.1)",
                }}
              >
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--chalk)" }}>
                  О компании
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {aboutText}
                </p>
              </div>
            )}

            {/* Jobs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-xl" style={{ color: "var(--chalk)" }}>
                  Открытые вакансии
                  {jobsList.length > 0 && (
                    <span
                      className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-normal"
                      style={{
                        background: "rgba(92,46,204,0.25)",
                        color: "var(--lavender)",
                        border: "1px solid rgba(196,173,255,0.2)",
                      }}
                    >
                      {jobsList.length}
                    </span>
                  )}
                </h2>
              </div>

              {jobsList.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Сейчас нет открытых вакансий
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobsList.map((job) => {
                    const salary = formatSalary(job.salary_from, job.salary_to, job.salary_negotiable);
                    return (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="job-card-hover block rounded-2xl p-5"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2" style={{ color: "var(--chalk)" }}>
                              {job.title ?? "Вакансия"}
                            </h3>

                            <div className="flex flex-wrap gap-2 mb-2">
                              {salary && (
                                <span
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{
                                    background: "rgba(201,168,76,0.15)",
                                    color: "var(--gold)",
                                    border: "1px solid rgba(201,168,76,0.3)",
                                  }}
                                >
                                  {salary}
                                </span>
                              )}
                              {job.city && (
                                <span
                                  className="px-2.5 py-1 rounded-full text-xs"
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  {job.city}
                                </span>
                              )}
                              {job.work_format && (
                                <span
                                  className="px-2.5 py-1 rounded-full text-xs"
                                  style={{
                                    background: "rgba(196,173,255,0.1)",
                                    color: "#C4ADFF",
                                    border: "1px solid rgba(196,173,255,0.2)",
                                  }}
                                >
                                  {FORMAT_LABELS[job.work_format] ?? job.work_format}
                                </span>
                              )}
                              {job.employment_type && (
                                <span
                                  className="px-2.5 py-1 rounded-full text-xs"
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  {EMP_LABELS[job.employment_type] ?? job.employment_type}
                                </span>
                              )}
                            </div>

                            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {timeAgoLabel(job.created_at)}
                            </div>
                          </div>

                          <div className="shrink-0 text-sm font-medium" style={{ color: "#C4ADFF" }}>
                            Подробнее →
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Contacts sidebar */}
          <div className="space-y-4">

            {/* Contacts card */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,173,255,0.1)",
              }}
            >
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                Контакты
              </h3>

              <div className="space-y-3">
                {c.website && (
                  <a
                    href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--lavender)" }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </span>
                    <span className="truncate">{c.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}

                {c.telegram && (
                  <a
                    href={`https://t.me/${c.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--lavender)" }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </span>
                    <span>{c.telegram.startsWith("@") ? c.telegram : `@${c.telegram}`}</span>
                  </a>
                )}

                {c.instagram && (
                  <a
                    href={`https://instagram.com/${c.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--lavender)" }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                    </span>
                    <span>{c.instagram.startsWith("@") ? c.instagram : `@${c.instagram}`}</span>
                  </a>
                )}

                {!c.website && !c.telegram && !c.instagram && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Контакты не указаны
                  </p>
                )}
              </div>
            </div>

            {/* Quick facts card */}
            {(employeeCount || c.founded_year || c.city || c.industry) && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(196,173,255,0.1)",
                }}
              >
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                  О компании
                </h3>

                <div className="space-y-3">
                  {c.industry && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Отрасль</div>
                      <div className="text-sm" style={{ color: "var(--chalk)" }}>{c.industry}</div>
                    </div>
                  )}
                  {c.city && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Город</div>
                      <div className="text-sm" style={{ color: "var(--chalk)" }}>{c.city}</div>
                    </div>
                  )}
                  {employeeCount && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Сотрудников</div>
                      <div className="text-sm" style={{ color: "var(--chalk)" }}>{employeeCount}</div>
                    </div>
                  )}
                  {c.founded_year && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Год основания</div>
                      <div className="text-sm" style={{ color: "var(--chalk)" }}>{c.founded_year}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Back link */}
            <Link
              href="/jobs"
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              ← Все вакансии
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
