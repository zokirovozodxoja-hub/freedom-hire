"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function CandidateProfile() {
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
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", candidateId).single();
      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      const { data: expData } = await supabase.from("experiences").select("*").eq("user_id", candidateId).order("start_date", { ascending: false });
      setExperiences(expData || []);

      const { data: skillsData } = await supabase.from("skills").select("*").eq("user_id", candidateId);
      setSkills(skillsData || []);
      setLoading(false);
    })();
  }, [candidateId]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Загрузка...</div>;
  if (!profile) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Профиль не найден</div>;

  const name = profile.full_name || "Кандидат";
  const salary = profile.desired_salary_from && profile.desired_salary_to 
    ? `${profile.desired_salary_from.toLocaleString()} - ${profile.desired_salary_to.toLocaleString()} сум`
    : profile.desired_salary_from 
    ? `от ${profile.desired_salary_from.toLocaleString()} сум`
    : "Не указана";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/employer/applications" className="inline-block text-blue-600 hover:underline mb-4">← Назад к откликам</Link>

        {/* Шапка профиля */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
          {profile.desired_position && (
            <div className="text-xl text-gray-700 mb-4">{profile.desired_position}</div>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            {profile.city && <span>{profile.city}</span>}
            {profile.email && <span>•</span>}
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span>•</span>}
            {profile.phone && <span>{profile.phone}</span>}
          </div>

          <div className="text-2xl font-semibold text-green-600 mb-4">{salary}</div>

          {profile.about && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">О себе</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.about}</p>
            </div>
          )}
        </div>

        {/* Навыки */}
        {skills.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ключевые навыки</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.id} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Опыт работы */}
        {experiences.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Опыт работы</h2>
            <div className="space-y-6">
              {experiences.map((exp, index) => (
                <div key={exp.id} className={index !== 0 ? "pt-6 border-t" : ""}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{exp.position}</h3>
                      <div className="text-gray-700">{exp.company}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {exp.start_date} — {exp.is_current ? "по настоящее время" : exp.end_date}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если нет данных */}
        {experiences.length === 0 && skills.length === 0 && !profile.about && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">Кандидат ещё не заполнил подробную информацию</p>
          </div>
        )}
      </div>
    </div>
  );
}
