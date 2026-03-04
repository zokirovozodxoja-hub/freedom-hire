"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getEmployerJobsStats, getJobViewStats, type JobViewStats } from "@/lib/analytics";

type JobStat = {
  jobId: string;
  title: string;
  views: number;
  applications: number;
};

export default function EmployerAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobsStats, setJobsStats] = useState<JobStat[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobStats, setSelectedJobStats] = useState<JobViewStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Totals
  const totalViews = jobsStats.reduce((sum, j) => sum + j.views, 0);
  const totalApplications = jobsStats.reduce((sum, j) => sum + j.applications, 0);
  const conversionRate = totalViews > 0 ? ((totalApplications / totalViews) * 100).toFixed(1) : "0";

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.replace("/auth");
        return;
      }

      // Проверяем роль
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "employer") {
        router.replace("/");
        return;
      }

      const stats = await getEmployerJobsStats();
      setJobsStats(stats);
      setLoading(false);
    })();
  }, [router]);

  async function loadJobDetails(jobId: string) {
    setSelectedJobId(jobId);
    setLoadingDetails(true);
    const stats = await getJobViewStats(jobId);
    setSelectedJobStats(stats);
    setLoadingDetails(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>
              📊 Аналитика
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              Статистика просмотров ваших вакансий
            </p>
          </div>
          <Link href="/employer"
            className="text-sm px-4 py-2 rounded-xl transition hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}>
            ← Назад
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.25)" }}>
                <svg className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Всего просмотров</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--chalk)" }}>{totalViews}</div>
          </div>

          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <svg className="w-5 h-5" style={{ color: "#22c55e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Всего откликов</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "#22c55e" }}>{totalApplications}</div>
          </div>

          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <svg className="w-5 h-5" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Конверсия</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--gold)" }}>{conversionRate}%</div>
          </div>
        </div>

        {/* Jobs table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="font-semibold" style={{ color: "var(--chalk)" }}>Статистика по вакансиям</h2>
          </div>

          {jobsStats.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: "rgba(255,255,255,0.4)" }}>У вас пока нет активных вакансий</p>
              <Link href="/employer/jobs/new"
                className="inline-block mt-4 btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                Создать вакансию
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {jobsStats.map((job) => (
                <div key={job.jobId}>
                  <button
                    onClick={() => loadJobDetails(job.jobId)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 transition hover:bg-white/5"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate" style={{ color: "var(--chalk)" }}>
                        {job.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div className="text-lg font-semibold" style={{ color: "var(--lavender)" }}>{job.views}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>просмотров</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold" style={{ color: "#22c55e" }}>{job.applications}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>откликов</div>
                      </div>
                      <svg className={`w-5 h-5 transition ${selectedJobId === job.jobId ? "rotate-180" : ""}`}
                        style={{ color: "rgba(255,255,255,0.3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded stats */}
                  {selectedJobId === job.jobId && (
                    <div className="px-5 pb-5">
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 rounded-full border-2 animate-spin"
                            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
                        </div>
                      ) : selectedJobStats ? (
                        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                          {/* Stats summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>
                                {selectedJobStats.today}
                              </div>
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Сегодня</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>
                                {selectedJobStats.thisWeek}
                              </div>
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>За неделю</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>
                                {selectedJobStats.thisMonth}
                              </div>
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>За месяц</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold" style={{ color: "var(--chalk)" }}>
                                {selectedJobStats.total}
                              </div>
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Всего</div>
                            </div>
                          </div>

                          {/* Simple bar chart */}
                          <div>
                            <div className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                              Просмотры за 14 дней
                            </div>
                            <div className="flex items-end gap-1 h-20">
                              {selectedJobStats.byDay.map((d, i) => {
                                const maxCount = Math.max(...selectedJobStats.byDay.map(x => x.count), 1);
                                const height = (d.count / maxCount) * 100;
                                const isToday = i === selectedJobStats.byDay.length - 1;
                                
                                return (
                                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                    <div 
                                      className="w-full rounded-t transition-all"
                                      style={{ 
                                        height: `${Math.max(height, 4)}%`,
                                        background: isToday 
                                          ? "linear-gradient(180deg, #5B2ECC, #7C4AE8)"
                                          : "rgba(196,173,255,0.3)",
                                      }}
                                      title={`${d.date}: ${d.count} просмотров`}
                                    />
                                    {i % 2 === 0 && (
                                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                        {new Date(d.date).getDate()}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
