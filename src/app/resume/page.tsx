"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile, type Status } from "@/lib/profile";
import { listMyExperiences, addExperience, updateExperience, deleteExperience, type Experience } from "@/lib/experiences";
import { listMySkills, addSkill, deleteSkill, type Skill, type SkillLevel } from "@/lib/skills";

function fmtNum(v: string) { const d = v.replace(/\D/g, ""); return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""; }
function parseNum(v: string) { const d = v.replace(/\D/g, ""); return d ? Number(d) : null; }
function totalExpMonths(items: Experience[]) {
  let m = 0; const now = new Date();
  for (const e of items) {
    if (!e.start_date) continue;
    const s = new Date(e.start_date);
    const en = e.end_date ? new Date(e.end_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const d = (en.getFullYear() - s.getFullYear()) * 12 + (en.getMonth() - s.getMonth());
    if (d > 0) m += d;
  }
  return m;
}
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

const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  actively_looking: { label: "Активно ищу работу",        color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.25)"  },
  open_to_offers:   { label: "Рассматриваю предложения",  color: "#C4ADFF", bg: "rgba(196,173,255,0.1)", border: "rgba(196,173,255,0.25)" },
  starting_new_job: { label: "Выхожу на новое место",     color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)"  },
  not_looking:      { label: "Не ищу работу",             color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)" },
};
const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Начинающий", junior: "Джуниор",
  intermediate: "Средний", advanced: "Продвинутый", expert: "Эксперт",
};
const LEVEL_PCT: Record<SkillLevel, number> = {
  beginner: 20, junior: 40, intermediate: 60, advanced: 80, expert: 100,
};
const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: "#6b7280", junior: "#C4ADFF", intermediate: "#818cf8",
  advanced: "#5B2ECC", expert: "#C9A84C",
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-card rounded-2xl p-6" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display text-xl" style={{ color: "var(--chalk)" }}>{children}</h2>
      {action}
    </div>
  );
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-accent text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(196,173,255,0.12)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#fff",
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  width: "100%",
  outline: "none",
  transition: "border-color 0.2s",
};

export default function ResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [status, setStatus] = useState<Status>("actively_looking");
  const [salaryText, setSalaryText] = useState("");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [addingExp, setAddingExp] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [nCo, setNCo] = useState(""); const [nPos, setNPos] = useState("");
  const [nS, setNS] = useState(""); const [nE, setNE] = useState("");
  const [savingExpId, setSavingExpId] = useState<string | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [addingSkill, setAddingSkill] = useState(false);
  const [sName, setSName] = useState("");
  const [sLevel, setSLevel] = useState<SkillLevel>("intermediate");

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    (async () => {
      const { profile, user, error } = await getMyProfile();
      if (!user) { router.replace("/auth?role=candidate"); return; }
      if (error) { notify(error.message, "err"); setLoading(false); return; }
      if (!profile?.is_onboarded) { router.replace("/onboarding/candidate"); return; }
      setProfile(profile);
      setFullName(profile.full_name ?? "");
      setHeadline(profile.headline ?? "");
      setCity(profile.city ?? "");
      setAbout(profile.about ?? "");
      setStatus((profile.job_search_status as Status) ?? "actively_looking");
      const sn = profile.salary_expectation ?? null;
      setSalaryText(sn ? fmtNum(String(sn)) : "");
      setCurrency((profile.salary_currency as "UZS" | "USD") ?? "UZS");
      const ex = await listMyExperiences(); setExperiences(ex.items ?? []);
      const sk = await listMySkills(); setSkills(sk.items ?? []);
      setLoading(false);
    })();
  }, [router]);

  const salaryNum = useMemo(() => parseNum(salaryText), [salaryText]);
  const totalM = useMemo(() => totalExpMonths(experiences), [experiences]);
  const expYears = Math.floor(totalM / 12), expMonths = totalM % 12;
  const statusMeta = STATUS_META[status] ?? STATUS_META.actively_looking;
  const initials = fullName ? fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  const completeness = useMemo(() => {
    if (!profile) return 0;
    let done = 0, total = 5;
    if (fullName.trim()) done++;
    if (headline.trim()) done++;
    if (about.trim()) done++;
    if (experiences.length) done++;
    if (skills.length) done++;
    return Math.round(done / total * 100);
  }, [profile, fullName, headline, about, experiences.length, skills.length]);

  async function saveProfile() {
    setSavingProfile(true);
    const { error } = await updateMyProfile({
      full_name: fullName.trim() || null,
      headline: headline.trim() || null,
      city: city.trim() || null,
      about: about.trim() || null,
      job_search_status: status,
      salary_expectation: salaryNum,
      salary_currency: currency,
      role: (profile?.role ?? "candidate") as "candidate" | "employer",
    });
    setSavingProfile(false);
    if (error) { notify(error.message, "err"); return; }
    setProfile((p: any) => ({ ...p, full_name: fullName, headline, city, about, job_search_status: status }));
    notify("Профиль сохранён");
  }

  async function addExp() {
    if (!nCo.trim() || !nPos.trim() || !nS) { notify("Заполните компанию, должность и дату начала", "err"); return; }
    const { error } = await addExperience({ company: nCo.trim(), position: nPos.trim(), start_date: nS, end_date: nE || null });
    if (error) { notify(error.message, "err"); return; }
    const ex = await listMyExperiences(); setExperiences(ex.items ?? []);
    setNCo(""); setNPos(""); setNS(""); setNE("");
    setAddingExp(false);
    notify("Опыт добавлен");
  }

  async function saveExp(x: Experience) {
    setSavingExpId(x.id);
    const { error } = await updateExperience(x.id, { company: x.company, position: x.position, start_date: x.start_date, end_date: x.end_date });
    setSavingExpId(null);
    if (error) { notify(error.message, "err"); return; }
    setEditingExpId(null);
    notify("Сохранено");
  }

  async function delExp(id: string) {
    await deleteExperience(id);
    setExperiences(prev => prev.filter(e => e.id !== id));
    notify("Удалено");
  }

  async function addSk() {
    if (!sName.trim()) { notify("Введите название навыка", "err"); return; }
    const { error } = await addSkill(sName.trim(), sLevel);
    if (error) { notify(error.message, "err"); return; }
    const sk = await listMySkills(); setSkills(sk.items ?? []);
    setSName(""); setAddingSkill(false);
    notify("Навык добавлен");
  }

  async function delSk(id: string) {
    await deleteSkill(id);
    setSkills(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          {[1, 2, 3].map(i => <div key={i} className="brand-card rounded-2xl animate-pulse" style={{ height: i === 1 ? 140 : 200 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 text-sm px-4 py-3 rounded-2xl font-body animate-fade-up"
          style={{
            background: toast.type === "ok" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${toast.type === "ok" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: toast.type === "ok" ? "#4ade80" : "#f87171",
            backdropFilter: "blur(12px)",
          }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── ШАПКА ПРОФИЛЯ ── */}
        <SectionCard>
          <div className="flex items-start gap-5 flex-wrap">

            {/* Аватар */}
            <label className="relative cursor-pointer shrink-0 group">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(135deg, #3D14BB, #7C4AE8)", border: "2px solid rgba(92,46,204,0.4)" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="av" className="w-full h-full object-cover" />
                  : <span className="font-display text-2xl" style={{ color: "var(--lavender)" }}>{initials}</span>
                }
              </div>
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <svg className="w-5 h-5" style={{color:"rgba(255,255,255,0.7)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const { createClient } = await import("@/lib/supabase/client");
                const sb = createClient();
                const { data: ud } = await sb.auth.getUser(); if (!ud.user) return;
                const ext = file.name.split(".").pop();
                const path = `avatars/${ud.user.id}.${ext}`;
                const { error: ue } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
                if (ue) { notify("Ошибка загрузки: " + ue.message, "err"); return; }
                const { data: url } = sb.storage.from("avatars").getPublicUrl(path);
                await sb.from("profiles").update({ avatar_url: url.publicUrl }).eq("id", ud.user.id);
                setProfile((p: any) => ({ ...p, avatar_url: url.publicUrl }));
                notify("Фото обновлено");
              }} />
            </label>

            {/* Имя и статус */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl mb-1" style={{ color: "var(--chalk)" }}>
                {fullName || "Мой профиль"}
              </h1>
              <div className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
                {headline}{headline && city ? " · " : ""}{city && `${city}`}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Статус */}
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-body"
                  style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color, boxShadow: `0 0 5px ${statusMeta.color}` }} />
                  {statusMeta.label}
                </span>

                {/* Стаж */}
                {(expYears > 0 || expMonths > 0) && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-body"
                    style={{ background: "rgba(196,173,255,0.1)", color: "var(--lavender)", border: "1px solid rgba(196,173,255,0.2)" }}>
                    Стаж {expYears > 0 ? `${expYears} г ` : ""}{expMonths > 0 ? `${expMonths} мес` : ""}
                  </span>
                )}

                {/* Зарплата */}
                {salaryNum && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-body font-semibold"
                    style={{ background: "rgba(201,168,76,0.1)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    {fmtNum(String(salaryNum))} {currency}
                  </span>
                )}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => router.push("/applications")}
                className="rounded-xl px-3 py-2 text-xs font-body transition"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                Отклики
              </button>
              <button onClick={() => router.push("/saved-jobs")}
                className="rounded-xl px-3 py-2 text-xs font-body transition"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                Сохранённые
              </button>
              <button onClick={() => window.open("/resume/print", "_blank")}
                className="rounded-xl px-3 py-2 text-xs font-body transition"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                PDF
              </button>
            </div>
          </div>

          {/* Прогресс заполненности */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-accent text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Заполненность профиля</span>
              <span className="font-accent text-xs font-bold"
                style={{ color: completeness === 100 ? "#4ade80" : "var(--lavender)" }}>
                {completeness}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completeness}%`,
                  background: completeness === 100
                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                    : "linear-gradient(90deg, var(--brand-core), var(--lavender))"
                }} />
            </div>
            {completeness < 100 && (
              <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {!headline.trim() && "Добавьте должность. "}
                {!about.trim() && "Заполните «О себе». "}
                {!experiences.length && "Добавьте опыт работы. "}
                {!skills.length && "Укажите навыки."}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── ОСНОВНАЯ ИНФОРМАЦИЯ ── */}
        <SectionCard>
          <SectionTitle>Основная информация</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="ФИО">
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович" style={inputStyle} />
            </InputField>

            <InputField label="Должность / Заголовок">
              <input value={headline} onChange={e => setHeadline(e.target.value)}
                placeholder="Напр. Руководитель отдела продаж" style={inputStyle} />
            </InputField>

            <InputField label="Город">
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="Ташкент" style={inputStyle} />
            </InputField>

            <InputField label="Статус поиска">
              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(STATUS_META).map(([v, m]) => (
                  <option key={v} value={v} style={{ background: "#0A0618" }}>{m.label}</option>
                ))}
              </select>
            </InputField>

            <InputField label="О себе">
              <textarea value={about} onChange={e => setAbout(e.target.value)}
                placeholder="Кратко о своём опыте, целях и сильных сторонах..."
                rows={3} style={{ ...inputStyle, resize: "none" }} />
            </InputField>

            <InputField label="Желаемая зарплата">
              <div className="flex gap-2">
                <input inputMode="numeric" placeholder="15 000 000"
                  value={salaryText} onChange={e => setSalaryText(fmtNum(e.target.value))}
                  style={{ ...inputStyle, flex: 1 }} />
                <select value={currency} onChange={e => setCurrency(e.target.value as "UZS" | "USD")}
                  style={{ ...inputStyle, width: 80, cursor: "pointer" }}>
                  <option value="UZS" style={{ background: "#0A0618" }}>UZS</option>
                  <option value="USD" style={{ background: "#0A0618" }}>USD</option>
                </select>
              </div>
            </InputField>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={saveProfile} disabled={savingProfile}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {savingProfile ? "Сохраняю..." : "Сохранить изменения"}
            </button>
          </div>
        </SectionCard>

        {/* ── ОПЫТ РАБОТЫ ── */}
        <SectionCard>
          <SectionTitle action={
            <button onClick={() => { setAddingExp(v => !v); setEditingExpId(null); }}
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white">
              {addingExp ? "Отмена" : "+ Добавить"}
            </button>
          }>
            Опыт работы
          </SectionTitle>

          {(expYears > 0 || expMonths > 0) && (
            <div className="text-xs mb-4 font-body" style={{ color: "rgba(255,255,255,0.35)" }}>
              Общий стаж:{" "}
              <span style={{ color: "var(--lavender)", fontWeight: 600 }}>
                {expYears > 0 ? `${expYears} г ` : ""}{expMonths > 0 ? `${expMonths} мес` : ""}
              </span>
            </div>
          )}

          {/* Форма добавления */}
          {addingExp && (
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: "rgba(92,46,204,0.08)", border: "1px solid rgba(92,46,204,0.25)" }}>
              <div className="font-accent text-xs mb-4" style={{ color: "var(--lavender)" }}>НОВОЕ МЕСТО РАБОТЫ</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <InputField label="Компания">
                  <input placeholder="Название компании" value={nCo} onChange={e => setNCo(e.target.value)} style={inputStyle} />
                </InputField>
                <InputField label="Должность">
                  <input placeholder="Ваша должность" value={nPos} onChange={e => setNPos(e.target.value)} style={inputStyle} />
                </InputField>
                <InputField label="Начало работы">
                  <input type="date" value={nS} onChange={e => setNS(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </InputField>
                <InputField label="Конец работы (пусто = сейчас)">
                  <input type="date" value={nE} onChange={e => setNE(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </InputField>
              </div>
              <div className="flex gap-2">
                <button onClick={addExp} className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold text-white">
                  Добавить
                </button>
                <button onClick={() => setAddingExp(false)}
                  className="rounded-xl px-5 py-2 text-sm font-body transition"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Список опыта */}
          {experiences.length === 0 && !addingExp ? (
            <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{background:"rgba(92,46,204,0.15)",border:"1px solid rgba(92,46,204,0.2)"}}><svg className="w-5 h-5" style={{color:"var(--lavender)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
              <div className="text-sm">Добавьте опыт работы</div>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((x) => (
                <div key={x.id} className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                  {editingExpId !== x.id ? (
                    /* Режим просмотра */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                          style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
                          {(x.company ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{x.company || "Компания"}</div>
                          <div className="text-sm" style={{ color: "var(--lavender)" }}>{x.position || "Должность"}</div>
                          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {fmtDate(x.start_date)} — {fmtDate(x.end_date)}
                            {calcDuration(x.start_date, x.end_date) && (
                              <span className="ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                                · {calcDuration(x.start_date, x.end_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingExpId(x.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-body transition"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          Изменить
                        </button>
                        <button onClick={() => delExp(x.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-body transition"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Режим редактирования */
                    <div>
                      <div className="font-accent text-xs mb-3" style={{ color: "var(--lavender)" }}>РЕДАКТИРОВАНИЕ</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <InputField label="Компания">
                          <input value={x.company ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, company: e.target.value } : ex))} style={inputStyle} />
                        </InputField>
                        <InputField label="Должность">
                          <input value={x.position ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, position: e.target.value } : ex))} style={inputStyle} />
                        </InputField>
                        <InputField label="Начало">
                          <input type="date" value={x.start_date ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, start_date: e.target.value } : ex))} style={{ ...inputStyle, colorScheme: "dark" }} />
                        </InputField>
                        <InputField label="Конец">
                          <input type="date" value={x.end_date ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, end_date: e.target.value } : ex))} style={{ ...inputStyle, colorScheme: "dark" }} />
                        </InputField>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveExp(x)} disabled={savingExpId === x.id}
                          className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          {savingExpId === x.id ? "Сохраняю..." : "Сохранить"}
                        </button>
                        <button onClick={() => setEditingExpId(null)}
                          className="rounded-xl px-5 py-2 text-sm font-body transition"
                          style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── НАВЫКИ ── */}
        <SectionCard>
          <SectionTitle action={
            <button onClick={() => setAddingSkill(v => !v)}
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white">
              {addingSkill ? "Отмена" : "+ Добавить"}
            </button>
          }>
            Навыки
          </SectionTitle>

          {addingSkill && (
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: "rgba(92,46,204,0.08)", border: "1px solid rgba(92,46,204,0.25)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <InputField label="Название навыка">
                  <input placeholder="B2B продажи, Excel, CRM..."
                    value={sName} onChange={e => setSName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSk()} style={inputStyle} />
                </InputField>
                <InputField label="Уровень">
                  <select value={sLevel} onChange={e => setSLevel(e.target.value as SkillLevel)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                      <option key={v} value={v} style={{ background: "#0A0618" }}>{l}</option>
                    ))}
                  </select>
                </InputField>
              </div>
              <button onClick={addSk} className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold text-white">
                Добавить
              </button>
            </div>
          )}

          {skills.length === 0 && !addingSkill ? (
            <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{background:"rgba(92,46,204,0.15)",border:"1px solid rgba(92,46,204,0.2)"}}><svg className="w-5 h-5" style={{color:"var(--lavender)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
              <div className="text-sm">Добавьте свои навыки</div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <div key={s.id} className="group flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: LEVEL_COLORS[s.level] ?? "#6b7280" }} />
                  <span className="text-sm font-body" style={{ color: "rgba(255,255,255,0.8)" }}>{s.name}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{LEVEL_LABELS[s.level]}</span>
                  <button onClick={() => delSk(s.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-xs ml-1"
                    style={{ color: "#f87171" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
