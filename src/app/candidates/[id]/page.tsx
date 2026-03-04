"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  desired_position: string | null;
  about: string | null;
  city: string | null;
  job_search_status: string | null;
};
type Skill = { id: string; name: string; level: string };
type Experience = { id: string; company: string | null; position: string | null; start_date: string | null; end_date: string | null };

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  actively_looking: { label: "Активно ищет работу",       color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.25)"  },
  open_to_offers:   { label: "Рассматривает предложения", color: "#C4ADFF", bg: "rgba(196,173,255,0.1)", border: "rgba(196,173,255,0.25)" },
  starting_new_job: { label: "Выходит на новое место",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)"  },
  not_looking:      { label: "Не ищет работу",            color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)" },
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#6b7280", junior: "#C4ADFF", intermediate: "#818cf8",
  advanced: "#5B2ECC", expert: "#C9A84C",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Начинающий", junior: "Джуниор", intermediate: "Средний",
  advanced: "Продвинутый", expert: "Эксперт",
};

function fmtDate(d: string | null) {
  if (!d) return "наст. время";
  return new Date(d).toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
}
function calcDuration(s: string | null, e: string | null) {
  if (!s) return "";
  const sd = new Date(s), ed = e ? new Date(e) : new Date();
  const m = (ed.getFullYear() - sd.getFullYear()) * 12 + (ed.getMonth() - sd.getMonth());
  if (m <= 0) return "";
  const y = Math.floor(m / 12), mo = m % 12;
  return [y ? `${y} г` : "", mo ? `${mo} мес` : ""].filter(Boolean).join(" ");
}

export default function CandidatePage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, headline, desired_position, about, city, job_search_status")
        .eq("id", candidateId)
        .maybeSingle();

      if (!p) { setLoading(false); return; }
      setProfile(p);

      const [{ data: sk }, { data: ex }] = await Promise.all([
        supabase.from("skills").select("id, name, level").eq("user_id", candidateId),
        supabase.from("experiences").select("id, company, position, start_date, end_date")
          .eq("user_id", candidateId).order("start_date", { ascending: false }),
      ]);
      setSkills((sk ?? []) as Skill[]);
      setExperiences((ex ?? []) as Experience[]);
      setLoading(false);
    })();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-4 pt-4">
          {[160, 120, 200].map((h, i) => (
            <div key={i} className="brand-card rounded-2xl animate-pulse" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="brand-card rounded-2xl p-10 text-center max-w-sm">
          <div className="font-body text-white/50 mb-4">Профиль не найден</div>
          <button onClick={() => router.back()}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
            Назад
          </button>
        </div>
      </div>
    );
  }

  const name = profile.full_name || "Кандидат";
  const statusInfo = STATUS_LABELS[profile.job_search_status ?? ""] ?? null;
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Back */}
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-body transition mb-2"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>

        {/* Profile header */}
        <div className="brand-card rounded-2xl p-6" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #3D14BB, #7C4AE8)", color: "var(--lavender)", border: "2px solid rgba(92,46,204,0.4)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl mb-1" style={{ color: "var(--chalk)" }}>{name}</h1>
              {(profile.headline || profile.desired_position) && (
                <div className="text-sm mb-2" style={{ color: "var(--lavender)" }}>
                  {profile.headline || profile.desired_position}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {profile.city && (
                  <span className="text-xs font-body px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {profile.city}
                  </span>
                )}
                {statusInfo && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-body px-2.5 py-1 rounded-full"
                    style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusInfo.color }} />
                    {statusInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.about && (
            <div className="mt-5 pt-4 text-sm font-body leading-relaxed"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              {profile.about}
            </div>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="brand-card rounded-2xl p-6" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
            <h2 className="font-display text-lg mb-4" style={{ color: "var(--chalk)" }}>Навыки</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: LEVEL_COLORS[s.level] ?? "#6b7280" }} />
                  <span className="text-sm font-body" style={{ color: "rgba(255,255,255,0.8)" }}>{s.name}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {LEVEL_LABELS[s.level] ?? s.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <div className="brand-card rounded-2xl p-6" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
            <h2 className="font-display text-lg mb-4" style={{ color: "var(--chalk)" }}>Опыт работы</h2>
            <div className="space-y-4">
              {experiences.map((exp, i) => (
                <div key={exp.id}>
                  {i > 0 && <div className="mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
                      {(exp.company ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold font-body text-white">{exp.position || "Должность"}</div>
                      <div className="text-sm" style={{ color: "var(--lavender)" }}>{exp.company || "Компания"}</div>
                      <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {fmtDate(exp.start_date)} — {fmtDate(exp.end_date)}
                        {calcDuration(exp.start_date, exp.end_date) && (
                          <span className="ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                            · {calcDuration(exp.start_date, exp.end_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
