"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/profile";
import {
  listMyExperiences,
  addExperience,
  updateExperience,
  deleteExperience,
  type Experience,
} from "@/lib/experiences";
import { listMySkills, addSkill, deleteSkill, type Skill, type SkillLevel } from "@/lib/skills";

type Status = "actively_looking" | "open_to_offers" | "starting_new_job" | "not_looking";

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

function totalExperienceMonths(items: Experience[]) {
  let months = 0;
  const now = new Date();
  const endFallback = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const e of items) {
    if (!e.start_date) continue;

    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : endFallback;

    const diff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    if (diff > 0) months += diff;
  }

  return months;
}
function monthsToYM(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return { years, months };
}

export default function ResumePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  // profile fields
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [status, setStatus] = useState<Status>("actively_looking");
  const [salaryText, setSalaryText] = useState("");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");

  // experiences
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [newCompany, setNewCompany] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  // skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { profile, user, error } = await getMyProfile();

      if (!user) {
        router.replace("/auth?role=candidate");
        return;
      }
      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }
      if (!profile?.is_onboarded) {
        router.replace("/onboarding/candidate");
        return;
      }

      setProfile(profile);

      setFullName(profile.full_name ?? "");
      setHeadline(profile.headline ?? "");
      setCity(profile.city ?? "");
      setAbout(profile.about ?? "");
      setStatus((profile.job_search_status as Status) ?? "actively_looking");

      const salaryNum = profile.salary_expectation ?? null;
      setSalaryText(salaryNum ? formatNumberWithSpaces(String(salaryNum)) : "");
      setCurrency((profile.salary_currency as "UZS" | "USD") ?? "UZS");

      const ex = await listMyExperiences();
      if (ex.error) setMsg((prev) => prev ?? ex.error?.message ?? "Ошибка загрузки опыта");
      setExperiences(ex.items ?? []);

      const sk = await listMySkills();
      if (sk.error) {
        setMsg((prev) => prev ?? sk.error?.message ?? "Ошибка загрузки навыков");
        setSkills([]);
      } else {
        setSkills(sk.items ?? []);
      }

      setLoading(false);
    })();
  }, [router]);

  const salaryNumber = useMemo(() => parseNumberSpaces(salaryText), [salaryText]);

  const totalMonths = useMemo(() => totalExperienceMonths(experiences), [experiences]);
  const totalYM = useMemo(() => monthsToYM(totalMonths), [totalMonths]);

  const completeness = useMemo(() => {
    if (!profile) return { percent: 0, missing: [] as string[] };

    const missing: string[] = [];
    if (!profile.avatar_url) missing.push("фото");
    if (!experiences.length) missing.push("опыт");
    if (!skills.length) missing.push("навыки");
    if (!salaryNumber) missing.push("зарплату");

    const total = 4;
    const done = total - missing.length;
    const percent = Math.round((done / total) * 100);

    return { percent, missing };
  }, [profile, experiences.length, skills.length, salaryNumber]);

  async function refreshExperiences() {
    const ex = await listMyExperiences();
    if (ex.error) setMsg((prev) => prev ?? ex.error?.message ?? "Ошибка загрузки опыта");
    setExperiences(ex.items ?? []);
  }

  async function refreshSkills() {
    const sk = await listMySkills();
    if (sk.error) {
      setMsg((prev) => prev ?? sk.error?.message ?? "Ошибка загрузки навыков");
      setSkills([]);
      return;
    }
    setSkills(sk.items ?? []);
  }

  async function saveProfile() {
    setSaving(true);
    setMsg(null);

    const payload: any = {
      full_name: fullName.trim() || null,
      headline: headline.trim() || null,
      city: city.trim() || null,
      about: about.trim() || null,
      job_search_status: status,
      salary_expectation: salaryNumber,
      salary_currency: currency,
    };

    const { error } = await updateMyProfile(payload);

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setProfile((p: any) => ({ ...(p ?? {}), ...payload }));
    setMsg("Сохранено ✅");
    setSaving(false);
  }

  async function addNewExperience() {
    setMsg(null);

    if (!newCompany.trim() || !newPosition.trim() || !newStart) {
      setMsg("Заполни: компания, должность, дата начала");
      return;
    }

    const payload = {
      company: newCompany.trim(),
      position: newPosition.trim(),
      start_date: newStart,
      end_date: newEnd || null,
    };

    const { error } = await addExperience(payload);
    if (error) {
      setMsg(error.message);
      return;
    }

    setNewCompany("");
    setNewPosition("");
    setNewStart("");
    setNewEnd("");

    await refreshExperiences();
    setMsg("Опыт добавлен ✅");
  }

  async function saveExpRow(x: Experience) {
    setMsg(null);

    const { error } = await updateExperience(x.id, {
      company: x.company ?? null,
      position: x.position ?? null,
      start_date: x.start_date ?? null,
      end_date: x.end_date ?? null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshExperiences();
    setMsg("Опыт обновлён ✅");
  }

  async function removeExp(id: string) {
    setMsg(null);

    const { error } = await deleteExperience(id);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshExperiences();
    setMsg("Удалено ✅");
  }

  async function addNewSkill() {
    setMsg(null);
    const name = skillName.trim();
    if (!name) {
      setMsg("Введи название навыка");
      return;
    }

    const { error } = await addSkill(name, skillLevel);
    if (error) {
      setMsg(error.message);
      return;
    }

    setSkillName("");
    setSkillLevel("intermediate");
    await refreshSkills();
    setMsg("Навык добавлен ✅");
  }

  async function removeSkill(id: string) {
    setMsg(null);

    const { error } = await deleteSkill(id);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshSkills();
    setMsg("Навык удалён ✅");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-6xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black/20 border border-white/10 overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-sm">Avatar</span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-semibold">{fullName || "Мой профиль"}</h1>
              <div className="text-white/70 mt-1">
                {headline ? headline : ""} {city ? `· ${city}` : ""}
              </div>

              <div className="text-sm text-white/70 mt-2">
                Общий стаж:{" "}
                <b>
                  {totalYM.years} г {totalYM.months} мес
                </b>
              </div>

              <div className="text-sm text-white/70 mt-2">
                Заполненность: <b>{completeness.percent}%</b>
                {completeness.missing.length ? (
                  <span> · Заполните: {completeness.missing.join(" / ")}</span>
                ) : (
                  <span> · Всё заполнено ✅</span>
                )}
              </div>

              {msg ? <div className="text-sm text-white/70 mt-2">{msg}</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/jobs")}
              className="rounded-2xl bg-white text-black px-5 py-2 font-semibold"
            >
              Перейти к вакансиям
            </button>

            <button
              onClick={() => window.open("/resume/print", "_blank")}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2"
            >
              Скачать PDF
            </button>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2 disabled:opacity-60"
            >
              {saving ? "Сохраняю..." : "Сохранить профиль"}
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {/* PROFILE */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Основные данные</div>

            <label className="text-xs text-white/60">ФИО</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />

            <label className="text-xs text-white/60 mt-4 block">Заголовок</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />

            <label className="text-xs text-white/60 mt-4 block">Город</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />

            <label className="text-xs text-white/60 mt-4 block">О себе</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="mt-2 w-full h-[110px] rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          {/* STATUS + SALARY */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Статус + Зарплата</div>

            <label className="text-xs text-white/60">Статус соискателя</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            >
              <option value="actively_looking">Активно ищу работу</option>
              <option value="open_to_offers">Рассматриваю предложения</option>
              <option value="starting_new_job">Выхожу на новое место</option>
              <option value="not_looking">Не ищу работу</option>
            </select>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="col-span-2">
                <label className="text-xs text-white/60">Желаемая зарплата</label>
                <input
                  inputMode="numeric"
                  placeholder="Напр. 30 000 000"
                  value={salaryText}
                  onChange={(e) => setSalaryText(formatNumberWithSpaces(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Валюта</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                >
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* EXPERIENCES */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/70 mb-3">Опыт работы</div>

          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <input
              placeholder="Компания"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />
            <input
              placeholder="Должность"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />

            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            />

            <button
              onClick={addNewExperience}
              className="rounded-2xl bg-white text-black px-5 py-3 font-semibold md:col-span-2"
            >
              Добавить опыт
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {experiences.length === 0 ? (
              <div className="text-white/60 text-sm">Пока нет опыта</div>
            ) : (
              experiences.map((x) => (
                <div key={x.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      value={x.company ?? ""}
                      onChange={(e) =>
                        setExperiences((prev) =>
                          prev.map((p) => (p.id === x.id ? { ...p, company: e.target.value } : p))
                        )
                      }
                      className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                      placeholder="Компания"
                    />

                    <input
                      value={x.position ?? ""}
                      onChange={(e) =>
                        setExperiences((prev) =>
                          prev.map((p) => (p.id === x.id ? { ...p, position: e.target.value } : p))
                        )
                      }
                      className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                      placeholder="Должность"
                    />

                    <input
                      type="date"
                      value={x.start_date ?? ""}
                      onChange={(e) =>
                        setExperiences((prev) =>
                          prev.map((p) =>
                            p.id === x.id ? { ...p, start_date: e.target.value } : p
                          )
                        )
                      }
                      className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                    />

                    <input
                      type="date"
                      value={x.end_date ?? ""}
                      onChange={(e) =>
                        setExperiences((prev) =>
                          prev.map((p) => (p.id === x.id ? { ...p, end_date: e.target.value } : p))
                        )
                      }
                      className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => saveExpRow(x)}
                      className="rounded-2xl bg-white text-black px-4 py-2 font-semibold"
                    >
                      Сохранить
                    </button>

                    <button
                      onClick={() => removeExp(x.id)}
                      className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SKILLS */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/70 mb-3">Навыки</div>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              placeholder="Напр. B2B продажи"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none md:col-span-2"
            />
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
              className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            >
              <option value="beginner">Начальный</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
              <option value="expert">Эксперт</option>
            </select>

            <button
              onClick={addNewSkill}
              className="rounded-2xl bg-white text-black px-5 py-3 font-semibold md:col-span-3"
            >
              Добавить навык
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {skills.length === 0 ? (
              <div className="text-white/60 text-sm">Пока нет навыков</div>
            ) : (
              skills.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-3"
                >
                  <div>
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-white/60">{s.level}</div>
                  </div>
                  <button
                    onClick={() => removeSkill(s.id)}
                    className="rounded-xl bg-white/10 border border-white/10 px-3 py-1 text-xs"
                  >
                    удалить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}