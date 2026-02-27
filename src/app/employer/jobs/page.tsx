"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type EmployerJob = {
  id: string;
  title: string | null;
  city: string | null;
  employment_type: string | null;
  salary_from: number | null;
  salary_to: number | null;
  description: string | null;
  is_active: boolean | null;
};

export default function EmployerJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        router.replace("/auth?role=employer");
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id,name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!company) {
        router.replace("/onboarding/employer");
        return;
      }

      setCompanyId(company.id);

      const { data: rows, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) setMsg(error.message);
      setJobs(rows ?? []);
      setLoading(false);
    })();
  }, [router]);

  async function toggleActive(job: EmployerJob) {
    setMsg(null);
    const { error } = await supabase
      .from("jobs")
      .update({ is_active: !job.is_active })
      .eq("id", job.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, is_active: !j.is_active } : j)));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Мои вакансии</h1>
            <div className="text-white/70 mt-1">company_id: {companyId}</div>
            {msg ? <div className="text-white/70 mt-2">{msg}</div> : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/employer")}
              className="bg-white/10 border border-white/10 px-5 py-2 rounded-2xl"
            >
              Назад
            </button>
            <button
              onClick={() => router.push("/employer/jobs/new")}
              className="bg-white text-black px-5 py-2 rounded-2xl font-semibold"
            >
              + Новая вакансия
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {jobs.length === 0 ? (
            <div className="text-white/70">Пока нет вакансий</div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{j.title}</div>
                    <div className="text-white/70 mt-1">
                      {j.city ? j.city : "Город не указан"} ·{" "}
                      {j.employment_type ? j.employment_type : "тип не указан"}
                    </div>
                    <div className="text-white/60 text-sm mt-2">
                      Зарплата:{" "}
                      {j.salary_from || j.salary_to
                        ? `${j.salary_from ?? "—"} – ${j.salary_to ?? "—"}`
                        : "не указана"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleActive(j)}
                    className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl"
                  >
                    {j.is_active ? "Снять с публикации" : "Опубликовать"}
                  </button>
                </div>

                {j.description ? (
                  <div className="text-white/70 mt-3 whitespace-pre-wrap">{j.description}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
