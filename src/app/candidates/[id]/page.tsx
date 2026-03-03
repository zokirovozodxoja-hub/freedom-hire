"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function CandidateProfileSimple() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/auth"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", candidateId).single();
      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      const { data: expData } = await supabase.from("experiences").select("*").eq("user_id", candidateId).order("start_date", { ascending: false });
      setExperiences(expData || []);

      const { data: skillsData } = await supabase.from("skills").select("*").eq("user_id", candidateId);
      setSkills(skillsData || []);
      setLoading(false);
    })();
  }, [candidateId, router]);

  if (loading) return <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">Загрузка...</div>;
  if (!profile) return <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">Профиль не найден</div>;

  const name = profile.full_name || "Кандидат";
  const initial = name[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        
        <Link href="/employer/applications" className="inline-block text-violet-400 hover:underline mb-6">← Назад к откликам</Link>

        {/* Шапка */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl font-bold shrink-0">
              {initial}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{name}</h1>
              {profile.desired_position && <p className="text-lg text-violet-400 mb-3">{profile.desired_position}</p>}
              
              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                {profile.city && <span>📍 {profile.city}</span>}
                {profile.email && <span>✉️ {profile.email}</span>}
                {profile.phone && <span>📞 {profile.phone}</span>}
              </div>

              {(profile.desired_salary_from || profile.desired_salary_to) && (
                <div className="mt-3 text-yellow-400 font-semibold">
                  💰 {profile.desired_salary_from?.toLocaleString()} - {profile.desired_salary_to?.toLocaleString()} сум
                </div>
              )}
            </div>
          </div>

          {profile.about && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/70 leading-relaxed">{profile.about}</p>
            </div>
          )}
        </div>

        {/* Навыки */}
        {skills.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Навыки</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.id} className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm">
                  {skill.name} <span className="text-xs opacity-60">• {skill.level}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Опыт */}
        {experiences.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Опыт работы</h2>
            <div className="space-y-4">
              {experiences.map((exp) => (
                <div key={exp.id} className="border-l-2 border-violet-500/30 pl-4">
                  <h3 className="font-semibold text-lg">{exp.position}</h3>
                  <p className="text-violet-400">{exp.company}</p>
                  <p className="text-sm text-white/40 mt-1">
                    {exp.start_date} - {exp.is_current ? "Настоящее время" : exp.end_date}
                  </p>
                  {exp.description && <p className="text-sm text-white/60 mt-2">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
