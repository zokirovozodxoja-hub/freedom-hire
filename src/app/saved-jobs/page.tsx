"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type SavedJob = {
  id: string;
  job_id: string;
  notes: string | null;
  created_at: string;
  jobs: {
    id: string;
    title: string | null;
    city: string | null;
    salary_from: number | null;
    salary_to: number | null;
    work_format: string | null;
    employment_type: string | null;
    is_active: boolean;
    companies: { name: string | null } | null;
  } | null;
};

export default function SavedJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    loadSavedJobs();
  }, []);

  async function loadSavedJobs() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/auth?role=candidate");
      return;
    }

    const { data } = await supabase
      .from("saved_jobs")
      .select(`
        id,
        job_id,
        notes,
        created_at,
        jobs (
          id,
          title,
          city,
          salary_from,
          salary_to,
          work_format,
          employment_type,
          is_active,
          companies ( name )
        )
      `)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    setSavedJobs((data || []) as unknown as SavedJob[]);
    setLoading(false);
  }

  async function removeJob(id: string) {
    if (!confirm("Удалить вакансию из сохранённых?")) return;

    const supabase = createClient();
    await supabase.from("saved_jobs").delete().eq("id", id);

    setSavedJobs(savedJobs.filter((job) => job.id !== id));
  }

  async function saveNotes(id: string) {
    const supabase = createClient();
    await supabase
      .from("saved_jobs")
      .update({ notes: noteText.trim() || null })
      .eq("id", id);

    setSavedJobs(
      savedJobs.map((job) =>
        job.id === id ? { ...job, notes: noteText.trim() || null } : job
      )
    );

    setEditingNotes(null);
    setNoteText("");
  }

  function formatSalary(from: number | null, to: number | null) {
    if (!from && !to) return "Не указана";
    const f = (n: number) => n.toLocaleString("ru-RU");
    if (from && to) return `${f(from)} – ${f(to)} сум`;
    if (from) return `от ${f(from)} сум`;
    return `до ${f(to!)} сум`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Сохранённые вакансии</h1>
          <p className="text-white/50">
            {savedJobs.length} {savedJobs.length === 1 ? "вакансия" : "вакансий"}
          </p>
        </div>

        {savedJobs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">❤️</div>
            <h2 className="text-xl font-semibold mb-2">Нет сохранённых вакансий</h2>
            <p className="text-white/50 mb-6">
              Сохраняйте понравившиеся вакансии, чтобы вернуться к ним позже
            </p>
            <Link
              href="/jobs"
              className="inline-block px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold transition"
            >
              Смотреть вакансии
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJobs.map((saved) => {
              const job = saved.jobs;
              if (!job) return null;

              const salary = formatSalary(job.salary_from, job.salary_to);

              return (
                <div
                  key={saved.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Job Title */}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-semibold text-lg hover:text-violet-400 transition truncate block mb-2"
                      >
                        {job.title || "Без названия"}
                      </Link>

                      {/* Company & Details */}
                      <div className="flex flex-wrap gap-3 text-sm text-white/60 mb-3">
                        {job.companies?.name && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {job.companies.name}
                          </span>
                        )}
                        {job.city && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.city}
                          </span>
                        )}
                        {job.work_format && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300">
                            {job.work_format === "remote" ? "Удалённо" : job.work_format === "hybrid" ? "Гибрид" : "Офис"}
                          </span>
                        )}
                      </div>

                      {/* Salary */}
                      <div className="text-[#f59e0b] font-semibold mb-3">
                        {salary}
                      </div>

                      {/* Notes */}
                      {editingNotes === saved.id ? (
                        <div className="mt-3">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Добавьте заметку..."
                            rows={3}
                            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => saveNotes(saved.id)}
                              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm font-medium transition"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => {
                                setEditingNotes(null);
                                setNoteText("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : saved.notes ? (
                        <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/10">
                          <p className="text-sm text-white/70">{saved.notes}</p>
                          <button
                            onClick={() => {
                              setEditingNotes(saved.id);
                              setNoteText(saved.notes || "");
                            }}
                            className="text-xs text-violet-400 hover:underline mt-2"
                          >
                            Редактировать заметку
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNotes(saved.id)}
                          className="text-xs text-white/40 hover:text-violet-400 transition"
                        >
                          + Добавить заметку
                        </button>
                      )}

                      {/* Saved date */}
                      <div className="text-xs text-white/30 mt-3">
                        Сохранено{" "}
                        {new Date(saved.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-semibold text-center transition"
                      >
                        Открыть
                      </Link>
                      <button
                        onClick={() => removeJob(saved.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition"
                      >
                        Удалить
                      </button>
                      {!job.is_active && (
                        <span className="text-xs text-center text-red-400">
                          Неактивна
                        </span>
                      )}
                    </div>
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
