"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  jobs: number;
  activeJobs: number;
  companies: number;
  candidates: number;
  employers: number;
  applications: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      const [jobs, activeJobs, companies, candidates, employers, applications] =
        await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("companies").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidate"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "employer"),
          supabase.from("applications").select("id", { count: "exact", head: true }),
        ]);

      setStats({
        jobs: jobs.count ?? 0,
        activeJobs: activeJobs.count ?? 0,
        companies: companies.count ?? 0,
        candidates: candidates.count ?? 0,
        employers: employers.count ?? 0,
        applications: applications.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = stats
    ? [
        { label: "Всего вакансий", value: stats.jobs, sub: `${stats.activeJobs} активных`, color: "from-violet-600/30" },
        { label: "Компании", value: stats.companies, color: "from-blue-600/30" },
        { label: "Соискатели", value: stats.candidates, color: "from-emerald-600/30" },
        { label: "Работодатели", value: stats.employers, color: "from-orange-600/30" },
        { label: "Отклики", value: stats.applications, color: "from-pink-600/30" },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Статистика</h1>

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.color} to-white/5 p-5`}
            >
              <div className="text-3xl font-black">{card.value.toLocaleString("ru-RU")}</div>
              <div className="text-sm text-white/70 mt-1">{card.label}</div>
              {card.sub && <div className="text-xs text-white/40 mt-0.5">{card.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
