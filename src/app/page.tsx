"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

type Job = {
 id: string;
 title: string | null;
 city: string | null;
 salary_from: number | null;
 salary_to: number | null;
 created_at: string;
 employment_type: string | null;
 work_format: string | null;
};

type Counts = { jobs: number; companies: number; candidates: number };

function formatSalaryI18n(
 from: number | null,
 to: number | null,
 fromFn: (v: string) => string,
 toFn: (v: string) => string
) {
 const fmt = (n: number) => {
 if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
 if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
 return n.toLocaleString("ru-RU");
 };
 if (!from && !to) return null;
 if (from && to) return `${fmt(from)} – ${fmt(to)}`;
 if (from) return fromFn(fmt(from));
 return toFn(fmt(to!));
}

function daysSinceI18n(
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

export default function HomePage() {
 const { t, lang } = useI18n();
 const [counts, setCounts] = useState<Counts>({ jobs: 0, companies: 0, candidates: 0 });
 const [jobs, setJobs] = useState<Job[]>([]);

 useEffect(() => {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) return;

 const supabase = createClient(url, key, { auth: { persistSession: false } });

 Promise.all([
 supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
 supabase.from("companies").select("id", { count: "exact", head: true }),
 supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidate"),
 supabase.from("jobs")
 .select("id,title,city,salary_from,salary_to,created_at,employment_type,work_format")
 .eq("is_active", true)
 .order("created_at", { ascending: false })
 .limit(6),
 ]).then(([jobsCount, companiesCount, candidatesCount, freshJobs]) => {
 setCounts({
 jobs: jobsCount.count ?? 0,
 companies: companiesCount.count ?? 0,
 candidates: candidatesCount.count ?? 0,
 });
 setJobs((freshJobs.data ?? []) as Job[]);
 });
 }, []);

 const locale = lang === "uz" ? "uz-UZ" : "ru-RU";

 return (
 <div className="min-h-screen" style={{ background: "var(--bg)" }}>

 {/* Background glow */}
 <div className="pointer-events-none fixed inset-0 overflow-hidden">
 <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-30"
 style={{ background: "radial-gradient(ellipse, #5B2ECC 0%, transparent 70%)" }} />
 <div className="absolute top-96 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
 style={{ background: "radial-gradient(ellipse, #3D14BB 0%, transparent 70%)" }} />
 </div>

 <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-16">

 {/* ═══ HERO ═══ */}
 <section className="text-center max-w-4xl mx-auto pt-8">
 <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 font-accent text-xs"
 style={{ background: "rgba(196,173,255,0.1)", border: "1px solid rgba(196,173,255,0.2)", color: "var(--lavender)" }}>
 {t.home.badge}
 </div>

 <h1 className="font-display text-5xl sm:text-7xl leading-[1.05] mb-4"
 style={{ color: "var(--chalk)" }}>
 {t.home.heroTitle1}<br />
 <em style={{ color: "var(--lavender)" }}>{t.home.heroTitle2}</em>
 </h1>

 <p className="font-body text-lg text-white/50 max-w-xl mx-auto mb-8 leading-relaxed">
 {t.home.heroSubtitle.split("\n").map((line, i) => (
 <span key={i}>{line}{i === 0 ? <br /> : null}</span>
 ))}
 </p>

 <div className="flex flex-wrap items-center justify-center gap-3">
 <Link href="/jobs"
 className="btn-primary inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-body font-semibold text-white">
 {t.home.findJob}
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
 </svg>
 </Link>
 <Link href="/auth?mode=signup&role=employer"
 className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-body font-semibold transition"
 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}>
 {t.home.postJob}
 </Link>
 </div>
 </section>

 {/* ═══ FEATURES ═══ */}
 <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {t.home.features.map((f) => (
 <div key={f.title} className="brand-card rounded-2xl p-6">
 <div className="font-body font-semibold text-white mb-2" style={{ fontSize: "15px" }}>{f.title}</div>
 <div className="font-body text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</div>
 </div>
 ))}
 </section>

 {/* ═══ FRESH JOBS ═══ */}
 <section>
 <div className="flex items-end justify-between mb-6">
 <div>
 <div className="font-accent text-xs mb-2" style={{ color: "var(--lavender)" }}>{t.home.freshJobs}</div>
 <h2 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--chalk)" }}>
 {t.home.latestOffers}
 </h2>
 </div>
 <Link href="/jobs"
 className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-body transition"
 style={{ border: "1px solid rgba(196,173,255,0.2)", color: "var(--lavender)" }}>
 {t.home.allJobs}
 </Link>
 </div>

 {jobs.length === 0 ? (
 <div className="brand-card rounded-3xl p-12 text-center">
 <div className="text-4xl mb-3"></div>
 <div className="font-body text-white/40">{t.home.noJobs}</div>
 <Link href="/auth?mode=signup&role=employer"
 className="mt-4 inline-block text-sm font-body"
 style={{ color: "var(--lavender)" }}>
 {t.home.postFirst}
 </Link>
 </div>
 ) : (
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {jobs.map((job) => {
 const salary = formatSalaryI18n(
 job.salary_from,
 job.salary_to,
 t.common.salary.from,
 t.common.salary.to
 );
 const fresh = isNew(job.created_at);
 const dateStr = daysSinceI18n(
 job.created_at,
 t.home.today,
 t.home.yesterday,
 t.home.daysAgo,
 locale
 );
 return (
 <Link key={job.id} href={`/jobs/${job.id}`}
 className="brand-card rounded-2xl p-5 flex flex-col gap-3 group transition hover:border-[rgba(196,173,255,0.3)]"
 style={{ borderColor: "rgba(196,173,255,0.12)" }}>

 <div className="flex items-start justify-between gap-2">
 <h3 className="font-body font-semibold text-white leading-snug group-hover:text-[var(--lavender)] transition line-clamp-2">
 {job.title ?? t.jobs.noTitle}
 </h3>
 {fresh && (
 <span className="badge-new shrink-0 text-xs px-2 py-0.5 rounded-full font-accent">{t.common.new}</span>
 )}
 </div>

 <div className="flex flex-wrap gap-2 text-xs font-body">
 {job.city && (
 <span className="flex items-center gap-1 text-white/50">
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 {job.city}
 </span>
 )}
 {job.work_format && (
 <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(196,173,255,0.08)", color: "var(--lavender)" }}>
 {job.work_format === "remote"
 ? t.jobs.formats.remote
 : job.work_format === "hybrid"
 ? t.jobs.formats.hybrid
 : t.jobs.formats.office}
 </span>
 )}
 </div>

 <div className="mt-auto flex items-center justify-between">
 {salary ? (
 <span className="font-body font-semibold text-sm" style={{ color: "var(--gold)" }}>
 {salary} {t.home.sum}
 </span>
 ) : (
 <span className="text-xs text-white/30 font-body">{t.home.salaryOnAgreement}</span>
 )}
 <span className="text-xs text-white/30 font-body">{dateStr}</span>
 </div>
 </Link>
 );
 })}
 </div>
 )}

 <div className="mt-4 sm:hidden">
 <Link href="/jobs"
 className="flex w-full items-center justify-center h-11 rounded-xl font-body text-sm transition"
 style={{ border: "1px solid rgba(196,173,255,0.2)", color: "var(--lavender)" }}>
 {t.home.allJobs}
 </Link>
 </div>
 </section>

 {/* ═══ EMPLOYER CTA ═══ */}
 <section className="brand-card rounded-3xl p-8 sm:p-12 relative overflow-hidden">
 <div className="absolute inset-0 opacity-30"
 style={{ background: "radial-gradient(ellipse at 80% 50%, #5B2ECC, transparent 60%)" }} />
 <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
 <div>
 <div className="font-accent text-xs mb-3" style={{ color: "var(--lavender)" }}>{t.home.forEmployers}</div>
 <h2 className="font-display text-3xl sm:text-4xl mb-2" style={{ color: "var(--chalk)" }}>
 {t.home.closeVacancy}<br /><em>{t.home.closeVacancy2}</em>
 </h2>
 <p className="font-body text-white/50 text-sm max-w-sm leading-relaxed">
 {t.home.employerDesc}
 </p>
 </div>
 <Link href="/auth?mode=signup&role=employer"
 className="btn-primary shrink-0 inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-body font-semibold text-white whitespace-nowrap">
 {t.home.postJob} →
 </Link>
 </div>
 </section>

 </div>
 </div>
 );
}
