"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
  companies: { name: string | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatSalary(from: number | null, to: number | null) {
  if (!from && !to) return "—";
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");

  async function load() {
    const supabase = createClient();
    let q = supabase
      .from("jobs")
      .select("id,title,city,is_active,created_at,salary_from,salary_to,companies(name)")
      .order("created_at", { ascending: false });

    if (filter === "active") q = q.eq("is_active", true);
    if (filter === "hidden") q = q.eq("is_active", false);

    const { data } = await q;
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("jobs").update({ is_active: !current }).eq("id", id);
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_active: !current } : j));
  }

  async function deleteJob(id: string) {
    if (!confirm("Удалить вакансию?")) return;
    const supabase = createClient();
    await supabase.from("jobs").delete().eq("id", id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Вакансии</h1>
        <div className="flex gap-2">
          {(["all", "active", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? "bg-[#7c3aed] text-white" : "bg-white/8 text-white/70 hover:text-white"
              }`}
            >
              {f === "all" ? "Все" : f === "active" ? "Активные" : "Скрытые"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : jobs.length === 0 ? (
        <p className="text-white/50">Нет вакансий</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{job.title ?? "Без названия"}</div>
                <div className="text-sm text-white/50 mt-0.5">
                  {job.companies?.name ?? "—"} · {job.city ?? "—"} · {formatDate(job.created_at)} · {formatSalary(job.salary_from, job.salary_to)}
                </div>
              </div>

              <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                job.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {job.is_active ? "Активна" : "Скрыта"}
              </span>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(job.id, job.is_active)}
                  className="px-3 py-1.5 rounded-xl bg-white/8 text-sm hover:bg-white/15 transition-colors"
                >
                  {job.is_active ? "Скрыть" : "Показать"}
                </button>
                <button
                  onClick={() => deleteJob(job.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
