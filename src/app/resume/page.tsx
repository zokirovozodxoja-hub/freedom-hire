"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyProfile, updateMyProfile, type Status } from "@/lib/profile";
import { listMyExperiences, addExperience, updateExperience, deleteExperience, type Experience } from "@/lib/experiences";
import { listMySkills, addSkill, deleteSkill, type Skill, type SkillLevel } from "@/lib/skills";
import { ResumeAI } from "@/components/ResumeAI";

/* ═══════════════════════════════════════════════════════════════════ */
/* HELPERS */
/* ═══════════════════════════════════════════════════════════════════ */
function fmtNum(v: string) { 
  const d = v.replace(/\D/g, ""); 
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""; 
}
function parseNum(v: string) { 
  const d = v.replace(/\D/g, ""); 
  return d ? Number(d) : null; 
}

function totalExpMonths(items: Experience[]) {
  let m = 0;
  const now = new Date();
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
  if (!d) return "по настоящее время";
  return new Date(d).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function calcDuration(s: string | null, e: string | null) {
  if (!s) return "";
  const sd = new Date(s), ed = e ? new Date(e) : new Date();
  const m = (ed.getFullYear() - sd.getFullYear()) * 12 + (ed.getMonth() - sd.getMonth());
  if (m <= 0) return "";
  const y = Math.floor(m / 12), mo = m % 12;
  return [y ? `${y} г.` : "", mo ? `${mo} мес.` : ""].filter(Boolean).join(" ");
}

/* ═══════════════════════════════════════════════════════════════════ */
/* CONSTANTS */
/* ═══════════════════════════════════════════════════════════════════ */
const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "actively_looking", label: "Активно ищу работу", color: "#22c55e" },
  { value: "open_to_offers", label: "Рассматриваю предложения", color: "#C4ADFF" },
  { value: "starting_new_job", label: "Выхожу на новое место", color: "#fbbf24" },
  { value: "not_looking", label: "Не ищу работу", color: "#6b7280" },
];

const LEVEL_OPTIONS: { value: SkillLevel; label: string; color: string }[] = [
  { value: "beginner", label: "Начальный", color: "#6b7280" },
  { value: "junior", label: "Базовый", color: "#60a5fa" },
  { value: "intermediate", label: "Средний", color: "#C4ADFF" },
  { value: "advanced", label: "Продвинутый", color: "#5B2ECC" },
  { value: "expert", label: "Эксперт", color: "#C9A84C" },
];

const POPULAR_SKILLS = [
  "MS Office", "Excel", "1C", "Продажи", "Переговоры", "Управление командой",
  "Английский язык", "Русский язык", "Узбекский язык", "Водительские права",
  "CRM", "Коммуникабельность", "Аналитика", "Презентации"
];

/* ═══════════════════════════════════════════════════════════════════ */
/* ICONS */
/* ═══════════════════════════════════════════════════════════════════ */
const Icons = {
  user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  briefcase: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
  phone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
  camera: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></>,
  x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
  pencil: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
  ai: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  doc: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  heart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
  download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
};

function Icon({ name, className = "w-5 h-5", style }: { name: keyof typeof Icons; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {Icons[name]}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* COMPONENTS */
/* ═══════════════════════════════════════════════════════════════════ */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,173,255,0.1)" }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, action }: { 
  icon: keyof typeof Icons; 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.25)", color: "var(--lavender)" }}>
          <Icon name={icon} />
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", aiButton, onAi }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  aiButton?: boolean;
  onAi?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
        {aiButton && (
          <button onClick={onAi} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition hover:scale-105"
            style={{ background: "linear-gradient(135deg, rgba(92,46,204,0.3), rgba(124,74,232,0.3))", color: "var(--lavender)" }}>
            <Icon name="ai" className="w-3 h-3" /> AI
          </button>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 transition outline-none focus:ring-2 focus:ring-violet-500/30"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, aiButton, onAi }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  aiButton?: boolean;
  onAi?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
        {aiButton && (
          <button onClick={onAi} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition hover:scale-105"
            style={{ background: "linear-gradient(135deg, rgba(92,46,204,0.3), rgba(124,74,232,0.3))", color: "var(--lavender)" }}>
            <Icon name="ai" className="w-3 h-3" /> AI помощник
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 transition outline-none resize-none focus:ring-2 focus:ring-violet-500/30"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm text-white transition outline-none cursor-pointer"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "#0A0618" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", disabled = false, loading = false }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
}) {
  const base = "rounded-xl font-medium transition inline-flex items-center justify-center gap-2 disabled:opacity-50";
  const sizes = { sm: "px-3 py-2 text-xs", md: "px-5 py-2.5 text-sm" };
  const variants: Record<string, string> = {
    primary: "btn-primary text-white",
    secondary: "text-white",
    ghost: "text-white/60 hover:text-white hover:bg-white/5",
    danger: "text-red-400 hover:bg-red-500/10",
  };
  const secondaryStyle = variant === "secondary" ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" } : {};
  
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]}`} style={secondaryStyle}>
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

function SkillTag({ skill, onRemove }: { skill: Skill; onRemove: () => void }) {
  const level = LEVEL_OPTIONS.find(l => l.value === skill.level);
  return (
    <div className="group flex items-center gap-2 rounded-xl px-3 py-2 transition"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: level?.color ?? "#6b7280" }} />
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{skill.name}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{level?.label}</span>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 ml-1 transition text-red-400">
        <Icon name="x" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ExperienceCard({ exp, onEdit, onDelete }: { exp: Experience; onEdit: () => void; onDelete: () => void }) {
  const duration = calcDuration(exp.start_date, exp.end_date);
  return (
    <div className="rounded-xl p-4 transition group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
          {(exp.company ?? "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-white">{exp.position || "Должность"}</h4>
              <p className="text-sm" style={{ color: "var(--lavender)" }}>{exp.company || "Компания"}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: "rgba(255,255,255,0.5)" }}>
                <Icon name="pencil" className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 transition text-red-400">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>{fmtDate(exp.start_date)} — {fmtDate(exp.end_date)}</span>
            {duration && <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>{duration}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* MAIN PAGE */
/* ═══════════════════════════════════════════════════════════════════ */
export default function ResumePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  
  // Profile
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [status, setStatus] = useState<Status>("actively_looking");
  const [salaryText, setSalaryText] = useState("");
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  
  // Experience
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expCompany, setExpCompany] = useState("");
  const [expPosition, setExpPosition] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expCurrent, setExpCurrent] = useState(false);
  
  // Skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");

  // AI Assistant
  const [showAI, setShowAI] = useState(false);

  const notify = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      const { profile: p, user, error } = await getMyProfile();
      if (!user) { router.replace("/auth?role=candidate"); return; }
      if (error) { notify(error.message, "err"); setLoading(false); return; }
      if (!p?.is_onboarded) { router.replace("/onboarding/candidate"); return; }
      
      setProfile(p);
      setFullName(p.full_name ?? "");
      setHeadline(p.headline ?? "");
      setCity(p.city ?? "");
      setAbout(p.about ?? "");
      setStatus((p.job_search_status as Status) ?? "actively_looking");
      setSalaryText(p.salary_expectation ? fmtNum(String(p.salary_expectation)) : "");
      setCurrency((p.salary_currency as "UZS" | "USD") ?? "UZS");
      
      const ex = await listMyExperiences(); setExperiences(ex.items ?? []);
      const sk = await listMySkills(); setSkills(sk.items ?? []);
      setLoading(false);
    })();
  }, [router, notify]);

  // Computed
  const salaryNum = useMemo(() => parseNum(salaryText), [salaryText]);
  const totalM = useMemo(() => totalExpMonths(experiences), [experiences]);
  const expYears = Math.floor(totalM / 12);
  const expMonths = totalM % 12;
  const initials = fullName ? fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

  const completeness = useMemo(() => {
    let done = 0;
    if (fullName.trim()) done++;
    if (headline.trim()) done++;
    if (about.trim()) done++;
    if (experiences.length) done++;
    if (skills.length) done++;
    return Math.round(done / 5 * 100);
  }, [fullName, headline, about, experiences.length, skills.length]);

  // Actions
  async function saveProfile() {
    setSaving(true);
    const { error } = await updateMyProfile({
      full_name: fullName.trim() || null,
      headline: headline.trim() || null,
      city: city.trim() || null,
      about: about.trim() || null,
      job_search_status: status,
      salary_expectation: salaryNum,
      salary_currency: currency,
      role: "candidate",
    });
    setSaving(false);
    if (error) { notify(error.message, "err"); return; }
    notify("✓ Сохранено");
  }

  async function handleAvatarUpload(file: File) {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data: ud } = await sb.auth.getUser();
    if (!ud.user) return;
    
    const ext = file.name.split(".").pop();
    const path = `avatars/${ud.user.id}_${Date.now()}.${ext}`;
    const { error: ue } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (ue) { notify("Ошибка: " + ue.message, "err"); return; }
    
    const { data: url } = sb.storage.from("avatars").getPublicUrl(path);
    await sb.from("profiles").update({ avatar_url: url.publicUrl }).eq("id", ud.user.id);
    setProfile((p: any) => ({ ...p, avatar_url: url.publicUrl }));
    notify("Фото обновлено");
  }

  async function handleAvatarDelete() {
    if (!confirm("Удалить фото?")) return;
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data: ud } = await sb.auth.getUser();
    if (!ud.user) return;
    await sb.from("profiles").update({ avatar_url: null }).eq("id", ud.user.id);
    setProfile((p: any) => ({ ...p, avatar_url: null }));
    notify("Фото удалено");
  }

  async function saveExperience() {
    if (!expCompany.trim() || !expPosition.trim() || !expStart) {
      notify("Заполните обязательные поля", "err"); return;
    }
    if (editingExp) {
      await updateExperience(editingExp.id, { company: expCompany.trim(), position: expPosition.trim(), start_date: expStart, end_date: expCurrent ? null : expEnd || null });
    } else {
      await addExperience({ company: expCompany.trim(), position: expPosition.trim(), start_date: expStart, end_date: expCurrent ? null : expEnd || null });
    }
    const ex = await listMyExperiences(); setExperiences(ex.items ?? []);
    resetExpForm();
    notify(editingExp ? "Обновлено" : "Добавлено");
  }

  function resetExpForm() {
    setShowExpForm(false); setEditingExp(null);
    setExpCompany(""); setExpPosition(""); setExpStart(""); setExpEnd(""); setExpCurrent(false);
  }

  function startEditExp(exp: Experience) {
    setEditingExp(exp); setExpCompany(exp.company ?? ""); setExpPosition(exp.position ?? "");
    setExpStart(exp.start_date ?? ""); setExpEnd(exp.end_date ?? ""); setExpCurrent(!exp.end_date); setShowExpForm(true);
  }

  async function deleteExp(id: string) {
    if (!confirm("Удалить?")) return;
    await deleteExperience(id);
    setExperiences(prev => prev.filter(e => e.id !== id));
  }

  async function saveSkill() {
    if (!skillName.trim()) { notify("Введите навык", "err"); return; }
    await addSkill(skillName.trim(), skillLevel);
    const sk = await listMySkills(); setSkills(sk.items ?? []);
    setSkillName(""); setShowSkillForm(false);
  }

  async function removeSkill(id: string) {
    await deleteSkill(id);
    setSkills(prev => prev.filter(s => s.id !== id));
  }

  async function handleAIApply(result: any) {
    setShowAI(false);
    // Basic info
    if (result.full_name !== undefined) setFullName(result.full_name ?? "");
    if (result.headline !== undefined) setHeadline(result.headline ?? "");
    if (result.city !== undefined) setCity(result.city ?? "");
    if (result.about !== undefined) setAbout(result.about ?? "");
    if (result.full_name || result.headline || result.city || result.about) {
      await updateMyProfile({
        full_name: result.full_name?.trim() || null,
        headline: result.headline?.trim() || null,
        city: result.city?.trim() || null,
        about: result.about?.trim() || null,
        job_search_status: status,
        salary_expectation: salaryNum,
        salary_currency: currency,
        role: "candidate",
      });
    }
    // Experiences
    if (result.experiences?.length) {
      for (const exp of result.experiences) {
        await addExperience({
          company: exp.company,
          position: exp.position,
          start_date: exp.start_date,
          end_date: exp.end_date ?? null,
        });
      }
      const ex = await listMyExperiences();
      setExperiences(ex.items ?? []);
    }
    // Skills
    if (result.skills?.length) {
      for (const sk of result.skills) {
        await addSkill(sk.name, sk.level as SkillLevel);
      }
      const sk = await listMySkills();
      setSkills(sk.items ?? []);
    }
    notify("✓ Данные применены");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* AI Modal */}
      {showAI && (
        <ResumeAI
          onApply={handleAIApply}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: toast.type === "ok" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.type === "ok" ? "#22c55e" : "#ef4444", backdropFilter: "blur(12px)" }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* HEADER CARD */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 self-start">
              <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #1A0044, #4A1FCC, #7C3AED)", border: "3px solid rgba(92,46,204,0.4)" }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-3xl text-white/80">{initials}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                <label className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:scale-110" style={{ background: "var(--brand-core)", border: "2px solid var(--ink)" }}>
                  <Icon name="camera" className="w-3.5 h-3.5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                </label>
                {profile?.avatar_url && (
                  <button onClick={handleAvatarDelete} className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:scale-110" style={{ background: "#ef4444", border: "2px solid var(--ink)" }}>
                    <Icon name="x" className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--chalk)" }}>{fullName || "Ваше имя"}</h1>
              <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>{headline || "Желаемая должность"}{city && ` · ${city}`}</p>
              
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: `${currentStatus.color}15`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentStatus.color }} />
                  {currentStatus.label}
                </span>
                {(expYears > 0 || expMonths > 0) && (
                  <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(196,173,255,0.1)", color: "var(--lavender)", border: "1px solid rgba(196,173,255,0.2)" }}>
                    Стаж: {expYears > 0 && `${expYears} г. `}{expMonths > 0 && `${expMonths} мес.`}
                  </span>
                )}
                {salaryNum && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "rgba(201,168,76,0.1)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    {fmtNum(String(salaryNum))} {currency}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button onClick={() => setShowAI(true)}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, rgba(92,46,204,0.4), rgba(124,74,232,0.4))", border: "1px solid rgba(92,46,204,0.4)", color: "#C4ADFF" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                ИИ-помощник
              </button>
              <Link href="/applications" className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                <Icon name="doc" className="w-4 h-4" /> Отклики
              </Link>
              <Link href="/saved-jobs" className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                <Icon name="heart" className="w-4 h-4" /> Избранное
              </Link>
              <button onClick={() => window.open("/resume/print", "_blank")} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                <Icon name="download" className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Заполненность профиля</span>
              <span className="text-xs font-bold" style={{ color: completeness === 100 ? "#22c55e" : "var(--lavender)" }}>{completeness}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completeness}%`, background: completeness === 100 ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, var(--brand-core), var(--lavender))" }} />
            </div>
            {completeness < 100 && (
              <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {!fullName && "Добавьте имя · "}{!headline && "Укажите должность · "}{!about && "Заполните «О себе» · "}{!experiences.length && "Добавьте опыт · "}{!skills.length && "Укажите навыки"}
              </p>
            )}
          </div>
        </Card>

        {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
        <Card>
          <SectionHeader icon="user" title="Основная информация" subtitle="Базовые данные для работодателей" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="ФИО" value={fullName} onChange={setFullName} placeholder="Иванов Иван Иванович" />
            <Input label="Желаемая должность" value={headline} onChange={setHeadline} placeholder="Менеджер по продажам" />
            <Input label="Город" value={city} onChange={setCity} placeholder="Ташкент" />
            <Select label="Статус поиска" value={status} onChange={v => setStatus(v as Status)} options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
            <div className="sm:col-span-2">
              <TextArea label="О себе" value={about} onChange={setAbout} placeholder="Расскажите о своём опыте, навыках и целях..." rows={4} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Желаемая зарплата</label>
              <div className="flex gap-2">
                <input value={salaryText} onChange={e => setSalaryText(fmtNum(e.target.value))} placeholder="15 000 000" inputMode="numeric"
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }} />
                <select value={currency} onChange={e => setCurrency(e.target.value as "UZS" | "USD")}
                  className="rounded-xl px-3 py-3 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)", color: "white" }}>
                  <option value="UZS" style={{ background: "#0A0618" }}>UZS</option>
                  <option value="USD" style={{ background: "#0A0618" }}>USD</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveProfile} loading={saving}>Сохранить изменения</Button>
          </div>
        </Card>

        {/* ОПЫТ РАБОТЫ */}
        <Card>
          <SectionHeader icon="briefcase" title="Опыт работы" subtitle={experiences.length ? `${experiences.length} места работы` : "Добавьте свой опыт"}
            action={!showExpForm && <Button size="sm" variant="secondary" onClick={() => setShowExpForm(true)}><Icon name="plus" className="w-4 h-4" /> Добавить</Button>} />
          
          {showExpForm && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(92,46,204,0.08)", border: "1px solid rgba(92,46,204,0.2)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Компания *" value={expCompany} onChange={setExpCompany} placeholder="Название компании" />
                <Input label="Должность *" value={expPosition} onChange={setExpPosition} placeholder="Ваша должность" />
                <Input label="Дата начала *" value={expStart} onChange={setExpStart} type="month" />
                <div>
                  <Input label="Дата окончания" value={expEnd} onChange={setExpEnd} type="month" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={expCurrent} onChange={e => setExpCurrent(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>По настоящее время</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveExperience}>{editingExp ? "Сохранить" : "Добавить"}</Button>
                <Button variant="ghost" onClick={resetExpForm}>Отмена</Button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {experiences.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} onEdit={() => startEditExp(exp)} onDelete={() => deleteExp(exp.id)} />
            ))}
            {!experiences.length && !showExpForm && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <svg className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Расскажите о своём опыте работы</p>
              </div>
            )}
          </div>
        </Card>

        {/* НАВЫКИ */}
        <Card>
          <SectionHeader icon="star" title="Навыки" subtitle={skills.length ? `${skills.length} навыков` : "Укажите ваши навыки"}
            action={!showSkillForm && <Button size="sm" variant="secondary" onClick={() => setShowSkillForm(true)}><Icon name="plus" className="w-4 h-4" /> Добавить</Button>} />
          
          {showSkillForm && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(92,46,204,0.08)", border: "1px solid rgba(92,46,204,0.2)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Навык" value={skillName} onChange={setSkillName} placeholder="Например: Excel" />
                <Select label="Уровень" value={skillLevel} onChange={v => setSkillLevel(v as SkillLevel)} options={LEVEL_OPTIONS.map(l => ({ value: l.value, label: l.label }))} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveSkill}>Добавить</Button>
                <Button variant="ghost" onClick={() => { setShowSkillForm(false); setSkillName(""); }}>Отмена</Button>
              </div>
            </div>
          )}
          
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map(s => <SkillTag key={s.id} skill={s} onRemove={() => removeSkill(s.id)} />)}
            </div>
          )}
          
          {/* Popular skills */}
          <div className="pt-4" style={{ borderTop: skills.length ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Популярные навыки:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.filter(p => !skills.find(s => s.name.toLowerCase() === p.toLowerCase())).slice(0, 8).map(p => (
                <button key={p} onClick={() => { setSkillName(p); setShowSkillForm(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg transition hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                  + {p}
                </button>
              ))}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}