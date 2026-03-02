"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  city: string | null;
  phone: string | null;
  is_blocked: boolean | null;
  is_onboarded: boolean | null;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
  position: string | null;
  experience_years: number | null;
};

type Experience = {
  id: string;
  company: string | null;
  position: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
};

type Skill = {
  id: string;
  name: string | null;
  level: string | null;
};

type Application = {
  id: string;
  created_at: string;
  status: string;
  job: { title: string | null; company: { name: string | null } | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: prof }, { data: exp }, { data: sk }, { data: apps }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("candidate_experiences").select("*").eq("profile_id", id).order("start_date", { ascending: false }),
        supabase.from("candidate_skills").select("*").eq("user_id", id),
        supabase.from("applications")
          .select("id, created_at, status, job:jobs(title, company:companies(name))")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setProfile(prof);
      setExperiences(exp ?? []);
      setSkills(sk ?? []);
      setApplications((apps ?? []) as unknown as Application[]);
      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleBlocked() {
    if (!profile) return;
    const supabase = createClient();
    const next = !profile.is_blocked;
    await supabase.from("profiles").update({ is_blocked: next }).eq("id", id);
    setProfile({ ...profile, is_blocked: next });
  }

  if (loading) return <div className="text-white/40 p-8">Загрузка...</div>;
  if (!profile) return <div className="text-white/40 p-8">Пользователь не найден</div>;

  const initials = (profile.full_name || profile.email)[0].toUpperCase();

  return (
    <div className="max-w-3xl">
      {/* Назад */}
      <Link href="/admin/users" className="flex items-center gap-1 text-sm mb-6"
        style={{ color: "#C4ADFF" }}>
        ← Все пользователи
      </Link>

      {/* Шапка */}
      <div className="rounded-2xl p-6 mb-4 flex items-start gap-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{ background: profile.role === "employer" ? "rgba(59,130,246,0.3)" : "rgba(124,58,237,0.3)" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{profile.full_name ?? "Без имени"}</h1>
            {profile.is_blocked && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                🚫 Заблокирован
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: profile.role === "employer" ? "rgba(59,130,246,0.15)" : "rgba(124,58,237,0.15)",
                       color: profile.role === "employer" ? "#93c5fd" : "#c4b5fd" }}>
              {profile.role === "employer" ? "Работодатель" : "Соискатель"}
            </span>
          </div>
          <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile.email}</div>
          <div className="mt-1 flex flex-wrap gap-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {profile.city && <span>📍 {profile.city}</span>}
            {profile.phone && <span>📞 {profile.phone}</span>}
            {profile.position && <span>💼 {profile.position}</span>}
            <span>📅 {formatDate(profile.created_at)}</span>
          </div>
          {profile.bio && (
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{profile.bio}</p>
          )}
        </div>
        <button onClick={toggleBlocked}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{
            background: profile.is_blocked ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
            color: profile.is_blocked ? "#6ee7b7" : "#f87171",
            border: profile.is_blocked ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(239,68,68,0.3)",
          }}>
          {profile.is_blocked ? "Разблокировать" : "Заблокировать"}
        </button>
      </div>

      {/* Опыт работы */}
      {experiences.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="font-semibold mb-4">💼 Опыт работы</h2>
          <div className="space-y-3">
            {experiences.map((e) => (
              <div key={e.id} className="pl-3" style={{ borderLeft: "2px solid rgba(124,74,232,0.4)" }}>
                <div className="font-medium text-sm">{e.position ?? "—"}</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{e.company}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {e.start_date} — {e.is_current ? "по настоящее время" : (e.end_date ?? "—")}
                </div>
                {e.description && (
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Навыки */}
      {skills.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="font-semibold mb-3">🛠 Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="px-3 py-1 rounded-full text-sm"
                style={{ background: "rgba(124,74,232,0.15)", border: "1px solid rgba(124,74,232,0.3)", color: "#C4ADFF" }}>
                {s.name}
                {s.level && <span className="ml-1 opacity-50 text-xs">· {s.level}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Отклики */}
      {applications.length > 0 && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="font-semibold mb-3">📋 Последние отклики</h2>
          <div className="space-y-2">
            {applications.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="font-medium">{a.job?.title ?? "—"}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {a.job?.company?.name} · {formatDate(a.created_at)}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: a.status === "accepted" ? "rgba(52,211,153,0.15)" :
                                a.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)",
                    color: a.status === "accepted" ? "#6ee7b7" :
                           a.status === "rejected" ? "#f87171" : "rgba(255,255,255,0.5)",
                  }}>
                  {a.status === "new" ? "Новый" :
                   a.status === "reviewing" ? "На рассмотрении" :
                   a.status === "accepted" ? "Принят" :
                   a.status === "rejected" ? "Отказ" : a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {experiences.length === 0 && skills.length === 0 && applications.length === 0 && (
        <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
          Профиль пустой — пользователь не заполнил данные
        </div>
      )}
    </div>
  );
}
