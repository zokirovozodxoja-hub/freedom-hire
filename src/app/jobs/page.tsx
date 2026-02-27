"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  salary: number | null;
  description: string | null;
};

export default function JobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/auth?role=candidate");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, city, salary, description")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
      }

      setJobs(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  async function handleApply(jobId: string) {
    setMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.push("/auth?role=candidate");
      return;
    }

    // Проверяем — уже откликался?
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

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Вакансии</h1>
          <button
            onClick={() => router.push("/resume")}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
          >
            Назад в кабинет
          </button>
        </div>

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
                      {job.title ?? "Без названия"}
                    </div>

                    <div className="text-white/70 text-sm mt-1">
                      {job.city ?? ""}{" "}
                      {job.salary ? `· ${job.salary}` : ""}
                    </div>

                    {job.description && (
                      <div className="text-white/70 text-sm mt-2">
                        {job.description}
                      </div>
                    )}
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
