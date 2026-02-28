"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Company = { id: string; name: string | null };

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Полная занятость" },
  { value: "part-time", label: "Частичная занятость" },
  { value: "contract", label: "Контракт/проект" },
  { value: "internship", label: "Стажировка" },
];

const FORMATS = [
  { value: "office", label: "Офис" },
  { value: "remote", label: "Удалёнка" },
  { value: "hybrid", label: "Гибрид" },
];

const EXPERIENCE_LEVELS = [
  { value: "no_experience", label: "Без опыта" },
  { value: "junior", label: "Junior (до 1 года)" },
  { value: "middle", label: "Middle (1–3 года)" },
  { value: "senior", label: "Senior (3+ года)" },
];

function fmt(value: string) {
  const d = value.replace(/\D/g, "");
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function parse(value: string) {
  const d = value.replace(/\D/g, "");
  return d ? Number(d) : null;
}

export default function NewJobPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");

  // Поля вакансии
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [city, setCity] = useState("");
  const [format, setFormat] = useState("office");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [experience, setExperience] = useState("middle");
  const [salaryFromText, setSalaryFromText] = useState("");
  const [salaryToText, setSalaryToText] = useState("");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const salaryFrom = useMemo(() => parse(salaryFromText), [salaryFromText]);
  const salaryTo = useMemo(() => parse(salaryToText), [salaryToText]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/auth"); return; }

      const { data: comps, error } = await supabase
        .from("companies")
        .select("id,name")
        .eq("owner_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) { setMsg(error.message); setLoading(false); return; }

      const list = (comps ?? []) as Company[];
      setCompanies(list);
      if (list[0]) setCompanyId(list[0].id);
      if (!list.length) setMsg("Сначала создайте компанию.");
      setLoading(false);
    })();
  }, [router, supabase]);

  async function onCreate() {
    setMsg(null);
    if (!title.trim()) { setMsg("Введите название вакансии."); return; }
    if (!companyId) { setMsg("Выберите компанию."); return; }
    if (!city.trim()) { setMsg("Введите город."); return; }
    if (!salaryNegotiable && salaryFrom && salaryTo && salaryFrom > salaryTo) {
      setMsg("Зарплата 'от' не может быть больше 'до'."); return;
    }

    setSaving(true);

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from("jobs").insert({
      company_id: companyId,
      title: title.trim(),
      description: description.trim() || null,
      requirements: requirements.trim() || null,
      benefits: benefits.trim() || null,
      city: city.trim(),
      format,
      employment_type: employmentType,
      experience_level: experience,
      salary_from: salaryNegotiable ? null : salaryFrom,
      salary_to: salaryNegotiable ? null : salaryTo,
      salary_negotiable: salaryNegotiable,
      tags: tags.length ? tags : null,
      is_active: isActive,
    });

    setSaving(false);

    if (error) { setMsg(error.message); return; }
    router.replace("/employer/jobs");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  const inputCls = "w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none focus:border-violet-500/50 transition";
  const labelCls = "text-xs text-white/60 block mb-2";

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Шапка */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Новая вакансия</h1>
            <p className="text-white/50 text-sm mt-1">Заполните все обязательные поля</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/employer/jobs")}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2 hover:bg-white/15 transition"
            >
              Отмена
            </button>
            <button
              onClick={onCreate}
              disabled={saving || !companyId}
              className="rounded-2xl bg-[#7c3aed] px-5 py-2 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-50"
            >
              {saving ? "Сохраняю..." : "Опубликовать"}
            </button>
          </div>
        </div>

        {msg && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
            {msg}
          </div>
        )}

        <div className="space-y-4">

          {/* Основное */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-white/70 mb-4">Основная информация</h2>
            <div className="space-y-4">

              <div>
                <label className={labelCls}>Название вакансии *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Frontend разработчик"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Компания *</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={inputCls}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                  ))}
                </select>
                {!companies.length && (
                  <button
                    onClick={() => router.push("/onboarding/employer")}
                    className="mt-2 text-sm text-violet-400 hover:underline"
                  >
                    + Создать компанию
                  </button>
                )}
              </div>

              <div>
                <label className={labelCls}>Описание вакансии</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Чем предстоит заниматься, о команде и проекте..."
                  rows={5}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Требования к кандидату</label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Опыт, навыки, образование..."
                  rows={4}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Условия и бенефиты</label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="Зарплата, ДМС, обучение, офис..."
                  rows={3}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Детали */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-white/70 mb-4">Детали работы</h2>
            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label className={labelCls}>Город *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ташкент"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Формат работы</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls}>
                  {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Тип занятости</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputCls}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Опыт работы</label>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} className={inputCls}>
                  {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Зарплата */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-white/70 mb-4">Зарплата</h2>

            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={salaryNegotiable}
                onChange={(e) => setSalaryNegotiable(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-white/70">По договорённости</span>
            </label>

            {!salaryNegotiable && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>От (сум)</label>
                  <input
                    inputMode="numeric"
                    value={salaryFromText}
                    onChange={(e) => setSalaryFromText(fmt(e.target.value))}
                    placeholder="3 000 000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>До (сум)</label>
                  <input
                    inputMode="numeric"
                    value={salaryToText}
                    onChange={(e) => setSalaryToText(fmt(e.target.value))}
                    placeholder="5 000 000"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Теги и публикация */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-white/70 mb-4">Навыки и публикация</h2>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Теги/навыки (через запятую)</label>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="React, TypeScript, Node.js"
                  className={inputCls}
                />
                {tagsText && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tagsText.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-violet-600" : "bg-white/20"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-white/70">
                  {isActive ? "Опубликовать сразу" : "Сохранить как черновик"}
                </span>
              </label>
            </div>
          </div>

        </div>

        {/* Кнопка снизу */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => router.push("/employer/jobs")}
            className="rounded-2xl bg-white/10 border border-white/10 px-6 py-3 hover:bg-white/15 transition"
          >
            Отмена
          </button>
          <button
            onClick={onCreate}
            disabled={saving || !companyId}
            className="rounded-2xl bg-[#7c3aed] px-6 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-50"
          >
            {saving ? "Сохраняю..." : "Опубликовать вакансию"}
          </button>
        </div>
      </div>
    </div>
  );
}
