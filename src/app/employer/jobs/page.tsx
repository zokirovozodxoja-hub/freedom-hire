"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Company = { id: string; name: string | null };
type Job = {
  id: string;
  title: string | null;
  description: string | null;
  city: string | null;
  work_format: string | null;
  employment_type: string | null;
  salary_from: number | null;
  salary_to: number | null;
  is_active: boolean | null;
  created_at: string | null;
  applications_count?: number;
};

const FORMAT_LABELS: Record<string, string> = {
  office: "Офис",
  remote: "Удалённо",
  hybrid: "Гибрид",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  "full-time": "Полная занятость",
  "part-time": "Частичная занятость",
  contract: "Контракт",
  internship: "Стажировка",
};

function formatMoneyRange(from: number | null, to: number | null) {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString("ru-RU");
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)} сум`;
  if (from) return `от ${fmt(from)} сум`;
  if (to) return `до ${fmt(to)} сум`;
  return "По договорённости";
}

export default function EmployerJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    setMsg(null);
    const supabase = createClient();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      router.replace("/auth?role=employer");
      return;
    }

    const { data: comp, error: compErr } = await supabase
      .from("companies")
      .select("id,name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (compErr) {
      setMsg(compErr.message);
      setLoading(false);
      return;
    }

    if (!comp) {
      router.replace("/onboarding/employer");
      return;
    }

    setCompany(comp);
    await loadJobs(comp.id, supabase);
    setLoading(false);
  }

  async function loadJobs(companyId: string, supabase = createClient()) {
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id, 
        title, 
        description, 
        city, 
        work_format, 
        employment_type, 
        salary_from, 
        salary_to, 
        is_active, 
        created_at
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setJobs([]);
      return;
    }

    // Получаем количество откликов для каждой вакансии
    const jobsWithCounts = await Promise.all(
      (data ?? []).map(async (job) => {
        const { count } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id);
        
        return { ...job, applications_count: count ?? 0 };
      })
    );

    setJobs(jobsWithCounts as Job[]);
  }

  async function toggleActive(job: Job) {
    setMsg(null);
    const next = !(job.is_active === true);
    const supabase = createClient();

    const { error } = await supabase.from("jobs").update({ is_active: next }).eq("id", job.id);
    if (error) {
      setMsg(error.message);
      return;
    }

    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, is_active: next } : j)));
  }

  async function deleteJob(jobId: string) {
    setDeleting(jobId);
    setMsg(null);
    const supabase = createClient();

    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    
    if (error) {
      setMsg(error.message);
      setDeleting(null);
      return;
    }

    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setDeleting(null);
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

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Вакансии работодателя</h1>
              <div className="text-white/60 mt-2 text-sm sm:text-base">
                Компания: <span className="text-white font-medium">{company?.name ?? company?.id}</span>
              </div>
              <div className="text-white/50 text-sm mt-1">
                Всего вакансий: {jobs.length}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push("/employer")}
                className="bg-white/10 border border-white/10 px-4 sm:px-5 py-2 rounded-2xl hover:bg-white/15 transition text-sm sm:text-base"
              >
                Назад
              </button>
              <button
                onClick={() => router.push("/employer/jobs/new")}
                className="btn-primary px-4 sm:px-5 py-2 rounded-2xl font-semibold  transition text-sm sm:text-base"
              >
                + Новая вакансия
              </button>
            </div>
          </div>

          {msg && (
            <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              {msg}
            </div>
          )}
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <div className="text-white/40 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Пока нет вакансий
              </div>
              <button
                onClick={() => router.push("/employer/jobs/new")}
                className="inline-block btn-primary px-6 py-3 rounded-2xl font-semibold  transition"
              >
                Создать первую вакансию
              </button>
            </div>
          ) : (
            jobs.map((job) => (
              <div 
                key={job.id} 
                className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 hover:border-white/20 transition"
              >
                {/* Job Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-white">
                        {job.title || "Без названия"}
                      </h3>
                      {job.is_active ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Активна
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
                          Черновик
                        </span>
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex flex-wrap gap-3 text-sm text-white/60">
                      {job.city && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.city}
                        </div>
                      )}
                      {job.work_format && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {FORMAT_LABELS[job.work_format] ?? job.work_format}
                        </div>
                      )}
                      {job.employment_type && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {EMPLOYMENT_LABELS[job.employment_type] ?? job.employment_type}
                        </div>
                      )}
                    </div>

                    {/* Salary */}
                    <div className="mt-3 font-semibold" style={{ color: "var(--gold)" }}>
                      {formatMoneyRange(job.salary_from, job.salary_to)}
                    </div>

                    {/* Description Preview */}
                    {job.description && (
                      <p className="mt-3 text-sm text-white/50 line-clamp-2">
                        {job.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
                      {job.created_at && (
                        <span>
                          Создано: {new Date(job.created_at).toLocaleDateString("ru-RU", { 
                            day: "numeric", 
                            month: "short", 
                            year: "numeric" 
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {job.applications_count ?? 0} откликов
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
                    className="flex items-center gap-2 btn-primary px-4 py-2 rounded-xl font-medium  transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактировать
                  </button>

                  <button
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/15 transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Просмотр
                  </button>

                  <button
                    onClick={() => toggleActive(job)}
                    className="flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/15 transition text-sm"
                  >
                    {job.is_active ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Снять с публикации
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Опубликовать
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteJob(job.id)}
                    disabled={deleting === job.id}
                    className="ml-auto flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl hover:bg-red-500/20 transition text-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {deleting === job.id ? "Удаление..." : "Удалить"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
