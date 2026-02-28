"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string | null;
  verification_status: string | null;
};

type Stats = {
  jobs: number;
  activeJobs: number;
  applications: number;
};

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<Stats>({ jobs: 0, activeJobs: 0, applications: 0 });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/auth"); return; }

      const { data: comp } = await supabase
        .from("companies")
        .select("id,name,verification_status")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (!comp) {
        router.replace("/onboarding/employer");
        return;
      }

      setCompany(comp);

      const [jobsRes, activeRes, appsRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", comp.id),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", comp.id).eq("is_active", true),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        jobs: jobsRes.count ?? 0,
        activeJobs: activeRes.count ?? 0,
        applications: appsRes.count ?? 0,
      });

      setLoading(false);
    })();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  const verStatus = company?.verification_status;
  const verBadge =
    verStatus === "approved"
      ? { label: "Верифицирована ✓", cls: "bg-emerald-500/20 text-emerald-400" }
      : verStatus === "pending"
      ? { label: "На проверке...", cls: "bg-yellow-500/20 text-yellow-400" }
      : { label: "Не верифицирована", cls: "bg-white/10 text-white/50" };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Шапка */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Кабинет работодателя</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/70">{company?.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verBadge.cls}`}>
                {verBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-white/50 hover:text-white transition px-4 py-2 rounded-xl hover:bg-white/5"
          >
            Выйти
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Всего вакансий", value: stats.jobs, color: "from-violet-600/20" },
            { label: "Активных", value: stats.activeJobs, color: "from-emerald-600/20" },
            { label: "Откликов", value: stats.applications, color: "from-blue-600/20" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${s.color} to-transparent p-5`}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Быстрые действия */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/employer/jobs/new"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
          >
            <div className="text-2xl mb-3">➕</div>
            <div className="font-semibold text-lg">Создать вакансию</div>
            <div className="text-sm text-white/50 mt-1">Разместите новую вакансию для поиска кандидатов</div>
          </Link>

          <Link
            href="/employer/jobs"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
          >
            <div className="text-2xl mb-3">💼</div>
            <div className="font-semibold text-lg">Мои вакансии</div>
            <div className="text-sm text-white/50 mt-1">
              {stats.jobs > 0 ? `${stats.jobs} вакансий, ${stats.activeJobs} активных` : "Вакансий пока нет"}
            </div>
          </Link>

          <Link
            href="/employer/applications"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition"
          >
            <div className="text-2xl mb-3">📬</div>
            <div className="font-semibold text-lg">Отклики</div>
            <div className="text-sm text-white/50 mt-1">
              {stats.applications > 0 ? `${stats.applications} откликов` : "Откликов пока нет"}
            </div>
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 opacity-50">
            <div className="text-2xl mb-3">🏢</div>
            <div className="font-semibold text-lg">Профиль компании</div>
            <div className="text-sm text-white/50 mt-1">Скоро: редактирование данных компании</div>
          </div>
        </div>

        {verStatus === "pending" && (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
            ⏳ Ваша компания находится на проверке. Это обычно занимает до 24 часов. После верификации вы сможете публиковать вакансии.
          </div>
        )}
      </div>
    </div>
  );
}
