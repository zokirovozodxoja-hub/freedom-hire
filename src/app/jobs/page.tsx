"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  company_id: string | null;
  salary_from: number | null;
  salary_to: number | null;
  is_active: boolean | null;
  created_at: string;
};

export default function JobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, company_id, salary_from, salary_to, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    }

    setJobs(data ?? []);
    setLoading(false);
  }

  async function handleApply(jobId: string) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/auth?role=candidate");
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

    setMessage("Отклик отправлен ✅");
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
        <h1 className="text-2xl font-semibold mb-6">Вакансии</h1>

        {message && (
          <div className="mb-4 text-sm text-white/70">
            {message}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-white/70">Вакансий пока нет</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">
                      Вакансия #{job.id.slice(0, 6)}
                    </div>

                    <div className="text-white/70 text-sm mt-1">
                      {job.salary_from && job.salary_to
                        ? `${job.salary_from} — ${job.salary_to}`
                        : "Зарплата не указана"}
                    </div>

                    <div className="text-white/50 text-xs mt-1">
                      Опубликовано: {new Date(job.created_at).toLocaleDateString("ru-RU")}
                    </div>
                  </div>

                  <button
                    onClick={() => handleApply(job.id)}
                    className="rounded-2xl bg-white text-black px-4 py-2 font-semibold"
                  >
                    Откликнуться
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}