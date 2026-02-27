"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  description: string | null;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU");
  } catch {
    return "";
  }
}

function formatSalary(from: number | null, to: number | null) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return "Зарплата не указана";
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

export default function JobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthed(!!data.user);
      await loadJobs();
    })();
  }, []);

  async function loadJobs() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("jobs")
      .select("id,title,city,description,created_at,salary_from,salary_to")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  }

  async function handleApply(jobId: string) {
    setMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/auth?role=candidate");
      return;
    }

    const { data: existing, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (checkError) {
      setMessage(checkError.message);
      return;
    }

    if (existing?.id) {
      setMessage("Ты уже откликался на эту вакансию ✅");
      return;
    }

    const { error } = await supabase.from("applications").insert({
      candidate_id: user.id,
      job_id: jobId,
      status: "applied",
      cover_letter: null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Отклик отправлен ✅ (его увидит работодатель в разделе заявок)");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка вакансий...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Вакансии</h1>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
            >
              На главную
            </button>

            {isAuthed ? (
              <button
                onClick={() => router.push("/resume")}
                className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
              >
                В кабинет
              </button>
            ) : (
              <button
                onClick={() => router.push("/auth?role=candidate")}
                className="rounded-2xl bg-white text-black px-4 py-2 font-semibold"
              >
                Войти, чтобы откликаться
              </button>
            )}
          </div>
        </div>

        {message && <div className="mb-4 text-sm text-white/70">{message}</div>}

        {jobs.length === 0 ? (
          <div className="text-white/70">Вакансий пока нет</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold hover:underline">
                      {job.title || `Вакансия #${job.id.slice(0, 6)}`}
                    </Link>

                    <div className="text-white/70 text-sm mt-1 flex flex-wrap gap-2">
                      <span>{job.city || "Узбекистан"}</span>
                      <span>•</span>
                      <span>{formatSalary(job.salary_from, job.salary_to)}</span>
                      <span>•</span>
                      <span>Опубликовано: {formatDate(job.created_at)}</span>
                    </div>

                    {job.description ? (
                      <div className="text-white/70 text-sm mt-2">
                        {job.description.slice(0, 160)}
                        {job.description.length > 160 ? "..." : ""}
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={() => handleApply(job.id)}
                    className="rounded-2xl bg-white text-black px-4 py-2 font-semibold whitespace-nowrap"
                  >
                    Откликнуться
                  </button>
                </div>

                <div className="mt-3">
                  <Link href={`/jobs/${job.id}`} className="text-sm text-white/70 hover:underline">
                    Смотреть полностью →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}