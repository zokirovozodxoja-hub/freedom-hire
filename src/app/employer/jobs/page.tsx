"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type Company = { id: string; name: string | null };
type Job = {
  id: string;
  company_id: string | null;
  salary_from: number | null;
  salary_to: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

function formatMoneyRange(from: number | null, to: number | null) {
  if (from && to) return `${from.toLocaleString("ru-RU")} – ${to.toLocaleString("ru-RU")}`;
  if (from) return `от ${from.toLocaleString("ru-RU")}`;
  if (to) return `до ${to.toLocaleString("ru-RU")}`;
  return "Зарплата не указана";
}

export default function EmployerJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      router.replace("/auth?role=employer");
      return;
    }

    // берём компанию работодателя
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
    await loadJobs(comp.id);
    setLoading(false);
  }

  async function loadJobs(companyId: string) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, company_id, salary_from, salary_to, is_active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setJobs([]);
      return;
    }

    setJobs((data ?? []) as Job[]);
  }

  async function toggleActive(job: Job) {
    setMsg(null);

    const next = !(job.is_active === true);

    const { error } = await supabase.from("jobs").update({ is_active: next }).eq("id", job.id);
    if (error) {
      setMsg(error.message);
      return;
    }

    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, is_active: next } : j)));
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
            <h1 className="text-2xl font-semibold">Вакансии работодателя</h1>
            <div className="text-white/70 mt-1">
              Компания: <b>{company?.name ?? company?.id}</b>
            </div>
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
                    <div className="text-lg font-semibold">Вакансия #{j.id.slice(0, 6)}</div>
                    <div className="text-white/70 mt-1">
                      {formatMoneyRange(j.salary_from, j.salary_to)}
                    </div>
                    {j.created_at ? (
                      <div className="text-white/50 text-xs mt-1">
                        Создано: {new Date(j.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={() => toggleActive(j)}
                    className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl"
                  >
                    {j.is_active ? "Снять с публикации" : "Опубликовать"}
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