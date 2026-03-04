"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Stats = {
  applications: number;
  savedJobs: number;
  profileViews: number;
  activeApplications: number;
};

type RecentApplication = {
  id: string;
  status: string;
  created_at: string;
  jobs: {
    title: string | null;
    companies: { name: string | null } | null;
  } | null;
};

type RecommendedJob = {
  id: string;
  title: string | null;
  city: string | null;
  salary_from: number | null;
  salary_to: number | null;
  work_format: string | null;
  created_at: string;
  companies: { name: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied: { label: "Отправлен", color: "text-blue-400" },
  in_progress: { label: "В работе", color: "text-yellow-400" },
  invited: { label: "Приглашён", color: "text-green-400" },
  rejected: { label: "Отказ", color: "text-red-400" },
};

export default function CandidateDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    applications: 0,
    savedJobs: 0,
    profileViews: 0,
    activeApplications: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/auth?role=candidate");
      return;
    }

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    setProfile(profileData);

    // Load stats
    const [applicationsCount, savedJobsCount, activeAppsCount] = await Promise.all([
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", userData.user.id),
      supabase
        .from("saved_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", userData.user.id)
        .in("status", ["applied", "in_progress", "invited"]),
    ]);

    setStats({
      applications: applicationsCount.count || 0,
      savedJobs: savedJobsCount.count || 0,
      profileViews: 0, // TODO: implement profile views tracking
      activeApplications: activeAppsCount.count || 0,
    });

    // Load recent applications
    const { data: appsData } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        created_at,
        jobs (
          title,
          companies ( name )
        )
      `)
      .eq("candidate_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentApplications((appsData || []) as unknown as RecentApplication[]);

    // Load recommended jobs (based on desired position or recent jobs)
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        city,
        salary_from,
        salary_to,
        work_format,
        created_at,
        companies ( name )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6);

    setRecommendedJobs((jobsData || []) as unknown as RecommendedJob[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
          <div className="text-sm font-body" style={{ color: "rgba(255,255,255,0.3)" }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  const profileCompletion = calculateProfileCompletion(profile);

  return (
    <div className="min-h-screen  text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Добро пожаловать, {profile?.full_name || "кандидат"}!
          </h1>
          <p className="text-white/50">Ваш личный кабинет</p>
        </div>

        {/* Profile Completion Banner */}
        {profileCompletion < 100 && (
          <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold mb-1">Заполните профиль</h3>
                <p className="text-sm text-white/60">
                  Профиль заполнен на {profileCompletion}%. Заполните полностью, чтобы повысить шансы на отклик.
                </p>
              </div>
              <Link
                href="/profile"
                className="shrink-0 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-semibold transition"
              >
                Заполнить
              </Link>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-violet-500 h-2 rounded-full transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="📝"
            label="Всего откликов"
            value={stats.applications}
            link="/applications"
          />
          <StatCard
            icon="🔥"
            label="Активные"
            value={stats.activeApplications}
            link="/applications"
            highlight
          />
          <StatCard
            icon="❤️"
            label="Сохранено"
            value={stats.savedJobs}
            link="/saved-jobs"
          />
          <StatCard
            icon="💬"
            label="Сообщения"
            value={0}
            link="/chat"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Recent Applications */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Последние отклики</h2>
              <Link
                href="/applications"
                className="text-sm text-violet-400 hover:underline"
              >
                Все →
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">Откликов пока нет</p>
                <Link
                  href="/jobs"
                  className="inline-block mt-3 text-violet-400 text-sm hover:underline"
                >
                  Найти вакансию
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => {
                  const statusInfo = STATUS_LABELS[app.status] || {
                    label: app.status,
                    color: "text-white/50",
                  };

                  return (
                    <div
                      key={app.id}
                      className="p-3 rounded-xl bg-black/20 border border-white/10"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-medium text-sm leading-snug">
                          {app.jobs?.title || "Без названия"}
                        </h3>
                        <span className={`text-xs shrink-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {app.jobs?.companies?.name && (
                        <p className="text-xs text-white/50">
                          {app.jobs.companies.name}
                        </p>
                      )}
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(app.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Рекомендации</h2>
              <Link
                href="/jobs"
                className="text-sm text-violet-400 hover:underline"
              >
                Все →
              </Link>
            </div>

            <div className="space-y-3">
              {recommendedJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-3 rounded-xl bg-black/20 border border-white/10 hover:border-violet-500/30 transition"
                >
                  <h3 className="font-medium text-sm leading-snug mb-1">
                    {job.title || "Без названия"}
                  </h3>
                  {job.companies?.name && (
                    <p className="text-xs text-white/50 mb-1">
                      {job.companies.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    {job.city && <span>{job.city}</span>}
                    {job.work_format && (
                      <>
                        <span>•</span>
                        <span>
                          {job.work_format === "remote"
                            ? "Удалённо"
                            : job.work_format === "hybrid"
                            ? "Гибрид"
                            : "Офис"}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <Link
            href="/jobs"
            className="p-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 hover:border-violet-500/50 transition text-center"
          >
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold mb-1">Найти работу</h3>
            <p className="text-xs text-white/50">
              Просмотрите актуальные вакансии
            </p>
          </Link>

          <Link
            href="/profile"
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-500/50 transition text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <h3 className="font-semibold mb-1">Редактировать профиль</h3>
            <p className="text-xs text-white/50">
              Обновите информацию о себе
            </p>
          </Link>

          <Link
            href="/saved-jobs"
            className="p-6 rounded-2xl bg-gradient-to-br from-pink-600/20 to-rose-600/20 border border-pink-500/30 hover:border-pink-500/50 transition text-center"
          >
            <div className="text-3xl mb-2">❤️</div>
            <h3 className="font-semibold mb-1">Сохранённые</h3>
            <p className="text-xs text-white/50">
              {stats.savedJobs} {stats.savedJobs === 1 ? "вакансия" : "вакансий"}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  link,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: number;
  link: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={link}
      className={`p-6 rounded-2xl border transition hover:border-violet-500/50 ${
        highlight
          ? "bg-gradient-to-br from-violet-600/20 to-purple-600/20 border-violet-500/30"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </Link>
  );
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;

  let completed = 0;
  const fields = [
    profile.full_name,
    profile.phone,
    profile.city,
    profile.desired_position,
    profile.about,
    profile.desired_salary_from || profile.desired_salary_to,
  ];

  fields.forEach((field) => {
    if (field) completed += 1;
  });

  return Math.round((completed / fields.length) * 100);
}
