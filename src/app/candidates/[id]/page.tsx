"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  desired_position: string | null;
  desired_salary_from: number | null;
  desired_salary_to: number | null;
  about: string | null;
  created_at: string;
};

type Experience = {
  id: string;
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
};

type Skill = {
  id: string;
  name: string;
  level: string;
};

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [candidateId]);

  async function loadProfile() {
    const supabase = createClient();

    // Проверяем авторизацию и роль
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/auth?role=employer");
      return;
    }

    // Загружаем профиль
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (profileError) {
      setError("Профиль не найден");
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Загружаем опыт работы
    const { data: expData } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", candidateId)
      .order("start_date", { ascending: false });

    setExperiences(expData || []);

    // Загружаем навыки
    const { data: skillsData } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", candidateId);

    setSkills(skillsData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😔</div>
          <div className="text-xl mb-2">{error || "Профиль не найден"}</div>
          <Link
            href="/employer/applications"
            className="mt-4 inline-block text-violet-400 hover:underline"
          >
            ← Вернуться к откликам
          </Link>
        </div>
      </div>
    );
  }

  const formatSalary = (from: number | null, to: number | null) => {
    if (!from && !to) return "не указана";
    const f = (n: number) => n.toLocaleString("ru-RU");
    if (from && to) return `${f(from)} – ${f(to)} сум`;
    if (from) return `от ${f(from)} сум`;
    return `до ${f(to!)} сум`;
  };

  const getExperienceYears = () => {
    if (experiences.length === 0) return "Нет опыта";
    
    let totalMonths = 0;
    experiences.forEach((exp) => {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months;
    });

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0) return `${months} мес`;
    if (months === 0) return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${months} мес`;
  };

  const initial = (profile.full_name || profile.email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Назад */}
        <Link
          href="/employer/applications"
          className="inline-flex items-center gap-2 text-sm text-violet-400 hover:underline mb-6"
        >
          ← Вернуться к откликам
        </Link>

        {/* Шапка профиля */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Аватар */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              {initial}
            </div>

            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                {profile.full_name || "Имя не указано"}
              </h1>

              {profile.desired_position && (
                <div className="text-lg text-white/70 mb-3">
                  {profile.desired_position}
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-white/60">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {profile.city}
                  </span>
                )}
                <span>•</span>
                <span>Опыт: {getExperienceYears()}</span>
              </div>

              {/* Контакты */}
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition"
                  >
                    📧 {profile.email}
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition"
                  >
                    📞 {profile.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Желаемая зарплата */}
          {(profile.desired_salary_from || profile.desired_salary_to) && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-sm text-white/50 mb-1">Желаемая зарплата</div>
              <div className="text-xl font-semibold text-[#f59e0b]">
                {formatSalary(profile.desired_salary_from, profile.desired_salary_to)}
              </div>
            </div>
          )}
        </div>

        {/* О себе */}
        {profile.about && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">О себе</h2>
            <p className="text-white/70 whitespace-pre-line leading-relaxed">
              {profile.about}
            </p>
          </div>
        )}

        {/* Навыки */}
        {skills.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Навыки</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300"
                >
                  <span className="font-medium">{skill.name}</span>
                  {skill.level && (
                    <span className="ml-2 text-xs text-violet-400">
                      • {skill.level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Опыт работы */}
        {experiences.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Опыт работы</h2>
            <div className="space-y-6">
              {experiences.map((exp, index) => {
                const startDate = new Date(exp.start_date).toLocaleDateString(
                  "ru-RU",
                  { month: "long", year: "numeric" }
                );
                const endDate = exp.end_date
                  ? new Date(exp.end_date).toLocaleDateString("ru-RU", {
                      month: "long",
                      year: "numeric",
                    })
                  : "Настоящее время";

                return (
                  <div
                    key={exp.id}
                    className={index !== 0 ? "pt-6 border-t border-white/10" : ""}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-white">
                          {exp.position}
                        </h3>
                        <div className="text-violet-400">{exp.company}</div>
                      </div>
                      <div className="text-sm text-white/50 whitespace-nowrap">
                        {startDate} — {endDate}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-white/60 text-sm mt-2 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Если нет данных */}
        {experiences.length === 0 && skills.length === 0 && !profile.about && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-white/50">
              Кандидат ещё не заполнил подробную информацию о себе
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
