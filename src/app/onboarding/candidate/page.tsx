"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/profile";

const STEPS = ["Основное", "Статус и зарплата", "Контакты"];

function CandidateOnboardingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const isEditMode = sp.get("edit") === "1";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Шаг 1
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");

  // Шаг 2
  const [jobStatus, setJobStatus] = useState("actively_looking");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("UZS");
  const [isVisible, setIsVisible] = useState(true);

  // Шаг 3
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [showContacts, setShowContacts] = useState(true);

  useEffect(() => {
    (async () => {
      const { profile, user, error } = await getMyProfile();
      if (!user) { router.push("/auth"); return; }
      if (error) { setMsg(error.message); setLoading(false); return; }

      if (profile?.is_onboarded && !isEditMode) {
        router.push("/resume");
        return;
      }

      if (profile) {
        setFullName(profile.full_name ?? "");
        setHeadline(profile.headline ?? "");
        setCity(profile.city ?? "");
        setAbout(profile.about ?? "");
        setJobStatus(profile.job_search_status ?? "actively_looking");
        setPhone(profile.phone ?? "");
        setTelegram(profile.telegram ?? "");
      }

      setLoading(false);
    })();
  }, [router, isEditMode]);

  function fmt(v: string) {
    const d = v.replace(/\D/g, "");
    return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);

    if (!fullName.trim()) {
      setMsg("Введите ФИО");
      setSaving(false);
      setStep(0);
      return;
    }

    const { error } = await updateMyProfile({
      full_name: fullName.trim() || null,
      headline: headline.trim() || null,
      city: city.trim() || null,
      about: about.trim() || null,
      job_search_status: jobStatus as any,
      salary_expectation: salaryFrom ? Number(salaryFrom.replace(/\D/g, "")) : null,
      salary_currency: salaryCurrency as any,
      phone: phone.trim() || null,
      telegram: telegram.trim() || null,
      is_onboarded: true,
      role: "candidate",
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    router.push("/resume");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  const inputCls = "mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none focus:border-violet-500/50 transition";
  const labelCls = "text-sm text-white/70";

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">

        {/* Прогресс */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                    i === step
                      ? "bg-violet-600 text-white"
                      : i < step
                      ? "bg-violet-600/30 text-violet-400 cursor-pointer"
                      : "bg-white/10 text-white/30"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </button>
                <span className={`text-sm ${i === step ? "text-white" : "text-white/40"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10 mx-1" />}
              </div>
            ))}
          </div>
          <div className="h-1 bg-white/10 rounded-full">
            <div
              className="h-1 bg-violet-600 rounded-full transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-semibold mb-1">
            {isEditMode ? "Редактирование профиля" : "Создание профиля"} — {STEPS[step]}
          </h1>
          <p className="text-white/50 text-sm mb-6">Шаг {step + 1} из {STEPS.length}</p>

          {msg && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              {msg}
            </div>
          )}

          {/* Шаг 1: Основное */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>ФИО *</label>
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <label className={labelCls}>Должность / Специализация</label>
                <input className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Frontend Developer" />
              </div>
              <div>
                <label className={labelCls}>Город</label>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ташкент" />
              </div>
              <div>
                <label className={labelCls}>О себе</label>
                <textarea className={inputCls + " h-28"} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Расскажите о себе, своём опыте и целях..." />
              </div>
            </div>
          )}

          {/* Шаг 2: Статус и зарплата */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Статус поиска работы</label>
                <select className={inputCls} value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}>
                  <option value="actively_looking">Активно ищу работу</option>
                  <option value="open_to_offers">Рассматриваю предложения</option>
                  <option value="not_looking">Не ищу работу</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Зарплатные ожидания</label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <input
                    className="col-span-2 rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none focus:border-violet-500/50"
                    inputMode="numeric"
                    value={salaryFrom}
                    onChange={(e) => setSalaryFrom(fmt(e.target.value))}
                    placeholder="Желаемая зарплата"
                  />
                  <select
                    className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                  >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setIsVisible((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isVisible ? "bg-violet-600" : "bg-white/20"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isVisible ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <div>
                    <div className="text-sm text-white/80">Профиль виден работодателям</div>
                    <div className="text-xs text-white/40">Работодатели смогут найти вас в поиске</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Шаг 3: Контакты */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Телефон</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" type="tel" />
              </div>
              <div>
                <label className={labelCls}>Telegram</label>
                <input className={inputCls} value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setShowContacts((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${showContacts ? "bg-violet-600" : "bg-white/20"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showContacts ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <div className="text-sm text-white/80">Показывать контакты</div>
                  <div className="text-xs text-white/40">Работодатели увидят ваш телефон и Telegram</div>
                </div>
              </label>
            </div>
          )}

          {/* Кнопки навигации */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => step > 0 ? setStep(step - 1) : router.push("/resume")}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2.5 hover:bg-white/15 transition"
            >
              {step === 0 ? "Отмена" : "← Назад"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => {
                  if (step === 0 && !fullName.trim()) {
                    setMsg("Введите ФИО");
                    return;
                  }
                  setMsg(null);
                  setStep(step + 1);
                }}
                className="rounded-2xl bg-[#7c3aed] px-5 py-2.5 font-semibold hover:bg-[#6d28d9] transition"
              >
                Далее →
              </button>
            ) : (
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-2xl bg-white text-black px-6 py-2.5 font-semibold disabled:opacity-60 hover:bg-white/90 transition"
              >
                {saving ? "Сохраняю..." : "Сохранить профиль ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    }>
      <CandidateOnboardingInner />
    </Suspense>
  );
}
