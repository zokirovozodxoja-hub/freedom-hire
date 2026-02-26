"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { addJobSkill, createJob, getMyCompanies, type Company } from "@/lib/employerJobs";

function formatNumberWithSpaces(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function parseNumberSpaces(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return null;
  return Number(digitsOnly);
}

export default function NewJobPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");

  // fields
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");

  // format/type
  const [employmentKind, setEmploymentKind] = useState<"full_time" | "part_time" | "project" | "internship">(
    "full_time"
  );
  const [workFormat, setWorkFormat] = useState<"office" | "remote" | "hybrid">("hybrid");

  // optional legacy field if you use it somewhere
  const [employmentTypeText, setEmploymentTypeText] = useState("гибрид");

  // salary
  const [salaryFromText, setSalaryFromText] = useState("");
  const [salaryToText, setSalaryToText] = useState("");

  // requirements
  const [minExpYears, setMinExpYears] = useState<number>(1);
  const [seniority, setSeniority] = useState<"junior" | "middle" | "senior" | "lead">("middle");
  const [education, setEducation] = useState<"any" | "secondary" | "bachelor" | "master">("any");

  // skills tags
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const salaryFrom = useMemo(() => parseNumberSpaces(salaryFromText), [salaryFromText]);
  const salaryTo = useMemo(() => parseNumberSpaces(salaryToText), [salaryToText]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth?role=employer");
        return;
      }

      const c = await getMyCompanies();
      if (c.error) {
        setMsg(c.error.message);
        setCompanies([]);
        setLoading(false);
        return;
      }

      setCompanies(c.items);
      setCompanyId(c.items[0]?.id ?? "");

      // если у работодателя ещё нет компании — отправим на onboarding employer
      if (!c.items.length) {
        setMsg("Сначала создай компанию работодателя.");
      }

      setLoading(false);
    })();
  }, [router]);

  function addSkillTag() {
    const s = skillInput.trim();
    if (!s) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function removeSkillTag(name: string) {
    setSkills((prev) => prev.filter((x) => x !== name));
  }

  async function onCreate() {
    setMsg(null);

    if (!companyId) {
      setMsg("Создай компанию работодателя (companies), потом создавай вакансию.");
      return;
    }
    if (!title.trim()) {
      setMsg("Заполни название вакансии");
      return;
    }

    // простая проверка зарплаты
    if (salaryFrom && salaryTo && salaryFrom > salaryTo) {
      setMsg("Зарплата 'от' не может быть больше 'до'");
      return;
    }

    setSaving(true);

    const res = await createJob({
      company_id: companyId,
      title: title.trim(),
      city: city.trim() || null,
      description: description.trim() || null,

      employment_type: employmentTypeText || null,
      employment_kind: employmentKind,
      work_format: workFormat,

      salary_from: salaryFrom,
      salary_to: salaryTo,

      min_experience_years: minExpYears ?? null,
      seniority,
      education_level: education,
    });

    if (res.error) {
      setMsg(res.error.message);
      setSaving(false);
      return;
    }

    const jobId = res.jobId!;
    // сохраним навыки
    for (const s of skills) {
      const r = await addJobSkill(jobId, s);
      if (r.error) {
        setMsg(`Вакансия создана, но навык не добавился: ${r.error.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.replace("/employer/jobs"); // если нет — поменяй на куда тебе нужно
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Новая вакансия</h1>
            <div className="text-white/60 mt-1">Заполни данные — и вакансия появится у кандидатов.</div>
            {msg ? <div className="text-white/70 text-sm mt-2">{msg}</div> : null}
          </div>

          <button
            onClick={onCreate}
            disabled={saving}
            className="rounded-2xl bg-white text-black px-5 py-2 font-semibold disabled:opacity-60"
          >
            {saving ? "Сохраняю..." : "Опубликовать"}
          </button>
        </div>

        <div className="mt-8 grid gap-4">
          {/* company */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Компания</div>

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>

            {!companies.length ? (
              <button
                onClick={() => router.push("/onboarding/employer")}
                className="mt-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
              >
                Создать компанию
              </button>
            ) : null}
          </div>

          {/* main */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Основное</div>

            <label className="text-xs text-white/60">Название *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="Напр. UX дизайнер"
            />

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs text-white/60">Город</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                  placeholder="Ташкент"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Формат</label>
                <select
                  value={workFormat}
                  onChange={(e) => setWorkFormat(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                >
                  <option value="office">Офис</option>
                  <option value="remote">Удалёнка</option>
                  <option value="hybrid">Гибрид</option>
                </select>

                {/* если тебе надо сохранить ещё и текстовое employment_type */}
                <input
                  value={employmentTypeText}
                  onChange={(e) => setEmploymentTypeText(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-black/10 border border-white/10 px-4 py-2 outline-none text-sm"
                  placeholder="(опционально) текстовое поле employment_type"
                />
              </div>
            </div>

            <label className="text-xs text-white/60 mt-4 block">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full h-[140px] rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="Обязанности, требования, условия..."
            />
          </div>

          {/* salary */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Зарплата</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60">Зарплата от</label>
                <input
                  inputMode="numeric"
                  placeholder="3 000 000"
                  value={salaryFromText}
                  onChange={(e) => setSalaryFromText(formatNumberWithSpaces(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Зарплата до</label>
                <input
                  inputMode="numeric"
                  placeholder="5 000 000"
                  value={salaryToText}
                  onChange={(e) => setSalaryToText(formatNumberWithSpaces(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="text-xs text-white/50 mt-2">Без стрелочек, ввод цифр с пробелами.</div>
          </div>

          {/* requirements */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Требования</div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/60">Опыт (лет)</label>
                <select
                  value={minExpYears}
                  onChange={(e) => setMinExpYears(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                >
                  <option value={0}>Без опыта</option>
                  <option value={1}>1 год</option>
                  <option value={2}>2 года</option>
                  <option value={3}>3 года</option>
                  <option value={5}>5+ лет</option>
                  <option value={10}>10+ лет</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/60">Уровень</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                >
                  <option value="junior">Junior</option>
                  <option value="middle">Middle</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/60">Образование</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                >
                  <option value="any">Не важно</option>
                  <option value="secondary">Среднее</option>
                  <option value="bachelor">Бакалавр</option>
                  <option value="master">Магистр</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs text-white/60">Тип занятости</label>
              <select
                value={employmentKind}
                onChange={(e) => setEmploymentKind(e.target.value as any)}
                className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              >
                <option value="full_time">Полная занятость</option>
                <option value="part_time">Частичная</option>
                <option value="project">Проектная</option>
                <option value="internship">Стажировка</option>
              </select>
            </div>
          </div>

          {/* skills */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Навыки для вакансии</div>

            <div className="grid md:grid-cols-3 gap-3">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Напр. Figma"
                className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none md:col-span-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addSkillTag}
                className="rounded-2xl bg-white text-black px-5 py-3 font-semibold"
              >
                Добавить
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <div className="text-white/60 text-sm">Добавь 3–7 ключевых навыков</div>
              ) : (
                skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeSkillTag(s)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    title="Нажми, чтобы удалить"
                  >
                    {s} ✕
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}