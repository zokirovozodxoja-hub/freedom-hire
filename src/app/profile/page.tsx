"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  desired_position: string;
  desired_salary_from: number | null;
  desired_salary_to: number | null;
  about: string;
  role: string;
};

type Skill = {
  id: string;
  name: string;
  level: string;
};

type Experience = {
  id: string;
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  description: string;
  is_current: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Profile
  const [profile, setProfile] = useState<Partial<Profile>>({});
  
  // Skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("middle");

  // Experience
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<string | null>(null);
  const [expForm, setExpForm] = useState({
    company: "",
    position: "",
    start_date: "",
    end_date: "",
    description: "",
    is_current: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    
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

    if (profileData) {
      setProfile(profileData);
    }

    // Load skills
    const { data: skillsData } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    setSkills(skillsData || []);

    // Load experiences
    const { data: expData } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("start_date", { ascending: false });

    setExperiences(expData || []);
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        city: profile.city || "",
        desired_position: profile.desired_position || "",
        desired_salary_from: profile.desired_salary_from,
        desired_salary_to: profile.desired_salary_to,
        about: profile.about || "",
      })
      .eq("id", userData.user.id);

    if (error) {
      setMessage("Ошибка: " + error.message);
    } else {
      setMessage("✅ Профиль сохранён!");
    }

    setSaving(false);
  }

  async function addSkill() {
    if (!newSkillName.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("skills")
      .insert({
        user_id: userData.user.id,
        name: newSkillName.trim(),
        level: newSkillLevel,
      })
      .select()
      .single();

    if (!error && data) {
      setSkills([data, ...skills]);
      setNewSkillName("");
    }
  }

  async function deleteSkill(id: string) {
    await supabase.from("skills").delete().eq("id", id);
    setSkills(skills.filter((s) => s.id !== id));
  }

  async function saveExperience() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (editingExp) {
      // Update
      const { data, error } = await supabase
        .from("experiences")
        .update({
          company: expForm.company,
          position: expForm.position,
          start_date: expForm.start_date,
          end_date: expForm.is_current ? null : expForm.end_date,
          description: expForm.description,
          is_current: expForm.is_current,
        })
        .eq("id", editingExp)
        .select()
        .single();

      if (!error && data) {
        setExperiences(experiences.map((e) => (e.id === editingExp ? data : e)));
        resetExpForm();
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from("experiences")
        .insert({
          user_id: userData.user.id,
          company: expForm.company,
          position: expForm.position,
          start_date: expForm.start_date,
          end_date: expForm.is_current ? null : expForm.end_date,
          description: expForm.description,
          is_current: expForm.is_current,
        })
        .select()
        .single();

      if (!error && data) {
        setExperiences([data, ...experiences]);
        resetExpForm();
      }
    }
  }

  async function deleteExperience(id: string) {
    await supabase.from("experiences").delete().eq("id", id);
    setExperiences(experiences.filter((e) => e.id !== id));
  }

  function editExperience(exp: Experience) {
    setExpForm({
      company: exp.company,
      position: exp.position,
      start_date: exp.start_date,
      end_date: exp.end_date || "",
      description: exp.description,
      is_current: exp.is_current,
    });
    setEditingExp(exp.id);
    setShowExpForm(true);
  }

  function resetExpForm() {
    setExpForm({
      company: "",
      position: "",
      start_date: "",
      end_date: "",
      description: "",
      is_current: false,
    });
    setEditingExp(null);
    setShowExpForm(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка профиля...
      </div>
    );
  }

  const inputCls = "w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition";
  const labelCls = "text-xs text-white/60 block mb-2 font-medium";

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Мой профиль</h1>
          <p className="text-white/50">Заполните информацию, чтобы работодатели могли вас найти</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.includes("✅") 
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {message}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Основная информация</h2>
          
          <div className="space-y-4">
            <div>
              <label className={labelCls}>ФИО *</label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email *</label>
              <input
                type="email"
                value={profile.email || ""}
                disabled
                className={inputCls + " opacity-50 cursor-not-allowed"}
              />
              <p className="text-xs text-white/30 mt-1">Email нельзя изменить</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Телефон</label>
                <input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Город</label>
                <input
                  type="text"
                  value={profile.city || ""}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="Ташкент"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Желаемая должность *</label>
              <input
                type="text"
                value={profile.desired_position || ""}
                onChange={(e) => setProfile({ ...profile, desired_position: e.target.value })}
                placeholder="Frontend разработчик"
                className={inputCls}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Желаемая зарплата от (сум)</label>
                <input
                  type="number"
                  value={profile.desired_salary_from || ""}
                  onChange={(e) => setProfile({ ...profile, desired_salary_from: e.target.value ? Number(e.target.value) : null })}
                  placeholder="5000000"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Желаемая зарплата до (сум)</label>
                <input
                  type="number"
                  value={profile.desired_salary_to || ""}
                  onChange={(e) => setProfile({ ...profile, desired_salary_to: e.target.value ? Number(e.target.value) : null })}
                  placeholder="8000000"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>О себе</label>
              <textarea
                value={profile.about || ""}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                placeholder="Расскажите о себе, своём опыте и достижениях..."
                rows={5}
                className={inputCls}
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold transition disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить профиль"}
            </button>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Навыки</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addSkill()}
              placeholder="Например: React"
              className={inputCls + " flex-1"}
            />
            <select
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(e.target.value)}
              className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white"
            >
              <option value="junior">Начальный</option>
              <option value="middle">Средний</option>
              <option value="senior">Продвинутый</option>
              <option value="expert">Эксперт</option>
            </select>
            <button
              onClick={addSkill}
              className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold transition"
            >
              Добавить
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center gap-2"
              >
                <span className="font-medium">{skill.name}</span>
                <span className="text-xs text-violet-400">• {skill.level}</span>
                <button
                  onClick={() => deleteSkill(skill.id)}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {skills.length === 0 && (
            <p className="text-white/30 text-sm">Добавьте свои навыки</p>
          )}
        </div>

        {/* Experience */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Опыт работы</h2>
            <button
              onClick={() => setShowExpForm(true)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-semibold transition"
            >
              + Добавить опыт
            </button>
          </div>

          {showExpForm && (
            <div className="mb-6 p-4 rounded-xl bg-black/20 border border-white/10">
              <h3 className="font-semibold mb-4">{editingExp ? "Редактировать" : "Новый"} опыт</h3>
              
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Компания *</label>
                    <input
                      type="text"
                      value={expForm.company}
                      onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                      placeholder="Google"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Должность *</label>
                    <input
                      type="text"
                      value={expForm.position}
                      onChange={(e) => setExpForm({ ...expForm, position: e.target.value })}
                      placeholder="Senior Developer"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Дата начала *</label>
                    <input
                      type="month"
                      value={expForm.start_date}
                      onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Дата окончания</label>
                    <input
                      type="month"
                      value={expForm.end_date}
                      onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })}
                      disabled={expForm.is_current}
                      className={inputCls}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={expForm.is_current}
                    onChange={(e) => setExpForm({ ...expForm, is_current: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-white/70">Работаю здесь сейчас</span>
                </label>

                <div>
                  <label className={labelCls}>Описание</label>
                  <textarea
                    value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    placeholder="Чем занимались, какие задачи решали..."
                    rows={3}
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveExperience}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold transition"
                  >
                    {editingExp ? "Сохранить" : "Добавить"}
                  </button>
                  <button
                    onClick={resetExpForm}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id} className="p-4 rounded-xl bg-black/20 border border-white/10">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-semibold">{exp.position}</h3>
                    <div className="text-violet-400 text-sm">{exp.company}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editExperience(exp)}
                      className="text-xs text-violet-400 hover:underline"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => deleteExperience(exp.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <div className="text-sm text-white/50 mb-2">
                  {new Date(exp.start_date).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  {" — "}
                  {exp.is_current ? "Настоящее время" : new Date(exp.end_date!).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </div>
                {exp.description && (
                  <p className="text-sm text-white/60">{exp.description}</p>
                )}
              </div>
            ))}
          </div>

          {experiences.length === 0 && !showExpForm && (
            <p className="text-white/30 text-sm">Добавьте свой опыт работы</p>
          )}
        </div>

      </div>
    </div>
  );
}
