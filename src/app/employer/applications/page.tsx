"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  jobs: { title: string | null } | null;
  candidate?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    desired_position: string | null;
  };
};

// ПОНЯТНЫЕ СТАТУСЫ
const STATUSES = [
  { key: "applied", label: "Новый", color: "blue", icon: "📩" },
  { key: "in_progress", label: "Рассматриваю", color: "yellow", icon: "👀" },
  { key: "invited", label: "Приглашён", color: "green", icon: "✅" },
  { key: "rejected", label: "Отказ", color: "red", icon: "❌" },
];

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/auth"); return; }

      const { data: company } = await supabase.from("companies").select("id").eq("owner_id", userData.user.id).maybeSingle();
      if (!company) { router.replace("/onboarding/employer"); return; }

      const { data: jobsList } = await supabase.from("jobs").select("id").eq("company_id", company.id);
      const jobIds = (jobsList ?? []).map((j) => j.id);
      if (jobIds.length === 0) { setApps([]); setLoading(false); return; }

      const { data } = await supabase.from("applications").select("id,job_id,candidate_id,status,created_at,cover_letter,jobs(title)").in("job_id", jobIds).order("created_at", { ascending: false });
      const candidateIds = [...new Set((data ?? []).map((app) => app.candidate_id))];
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email,phone,city,desired_position").in("id", candidateIds);
      const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const appsWithProfiles = (data ?? []).map((app) => ({ ...app, candidate: profilesMap.get(app.candidate_id) }));

      setApps(appsWithProfiles as unknown as Application[]);
      setLoading(false);
    })();
  }, [router]);

  async function updateStatus(appId: string, status: string) {
    const supabase = createClient();
    await supabase.from("applications").update({ status }).eq("id", appId);
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
  }

  const filtered = filter ? apps.filter((a) => a.status === filter) : apps;
  const getStatus = (key: string) => STATUSES.find((s) => s.key === key) || STATUSES[0];

  if (loading) return <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Отклики кандидатов</h1>
          
          {/* Фильтры */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter("")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!filter ? "bg-violet-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
              Все ({apps.length})
            </button>
            {STATUSES.map((s) => {
              const count = apps.filter((a) => a.status === s.key).length;
              return (
                <button key={s.key} onClick={() => setFilter(s.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === s.key ? `bg-${s.color}-600 text-white` : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                  {s.icon} {s.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Список */}
        {filtered.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-white/40">Откликов пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => {
              const status = getStatus(app.status);
              const name = app.candidate?.full_name || app.candidate?.email || "Кандидат";

              return (
                <div key={app.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    
                    {/* Аватар */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl font-bold shrink-0">
                      {name[0].toUpperCase()}
                    </div>

                    <div className="flex-1">
                      {/* Имя */}
                      <h3 className="font-semibold text-lg mb-1">{name}</h3>
                      {app.candidate?.desired_position && (
                        <p className="text-sm text-violet-400 mb-2">{app.candidate.desired_position}</p>
                      )}

                      {/* Инфо */}
                      <div className="text-sm text-white/50 mb-3">
                        <span>{app.candidate?.email}</span>
                        {app.candidate?.phone && <span> • {app.candidate.phone}</span>}
                        {app.candidate?.city && <span> • {app.candidate.city}</span>}
                      </div>

                      <p className="text-xs text-white/40">На вакансию: {app.jobs?.title ?? "—"}</p>

                      {/* Действия */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Link href={`/candidates/${app.candidate_id}`} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm font-medium transition">
                          Профиль
                        </Link>
                        <Link href={`/chat/${app.id}`} className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium transition">
                          Написать
                        </Link>
                      </div>
                    </div>

                    {/* Статус - кнопки */}
                    <div className="flex flex-col gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => updateStatus(app.id, s.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            app.status === s.key
                              ? `bg-${s.color}-500/20 border border-${s.color}-500/50 text-${s.color}-400`
                              : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
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
