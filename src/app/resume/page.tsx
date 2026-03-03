"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile, type Status } from "@/lib/profile";
import {
 listMyExperiences, addExperience, updateExperience,
 deleteExperience, type Experience,
} from "@/lib/experiences";
import { listMySkills, addSkill, deleteSkill, type Skill, type SkillLevel } from "@/lib/skills";

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
 if (!d) return "по наст. время";
 return new Date(d).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}
function calcDuration(s: string | null, e: string | null) {
 if (!s) return "";
 const sd = new Date(s), ed = e ? new Date(e) : new Date();
 const m = (ed.getFullYear() - sd.getFullYear()) * 12 + (ed.getMonth() - sd.getMonth());
 if (m <= 0) return "";
 const y = Math.floor(m / 12), mo = m % 12;
 return [y ? `${y} г` : "", mo ? `${mo} мес` : ""].filter(Boolean).join(" ");
}

const STATUS_META: Record<Status, { label: string; dot: string }> = {
 actively_looking: { label: "Активно ищу работу", dot: "#4ade80" },
 open_to_offers: { label: "Рассматриваю предложения", dot: "#c4b5fd" },
 starting_new_job: { label: "Выхожу на новое место", dot: "#fbbf24" },
 not_looking: { label: "Не ищу работу", dot: "#6b7280" },
};
const LEVEL_LABELS: Record<SkillLevel, string> = {
 beginner: "Начинающий", junior: "Джуниор",
 intermediate: "Средний", advanced: "Продвинутый", expert: "Эксперт",
};
const LEVEL_PCT: Record<SkillLevel, number> = {
 beginner: 20, junior: 40, intermediate: 60, advanced: 80, expert: 100,
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

 const completeness = useMemo(() => {
 if (!profile) return 0;
 let done = 0;
 if (profile.avatar_url) done++;
 if (experiences.length) done++;
 if (skills.length) done++;
 if (salaryNum) done++;
 return Math.round(done / 4 * 100);
 }, [profile, experiences.length, skills.length, salaryNum]);

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
 setProfile((p: any) => ({ ...p, full_name: fullName, headline, city, about, job_search_status: status, salary_expectation: salaryNum, salary_currency: currency }));
 notify("Профиль сохранён");
 }

 async function refEx() { const ex = await listMyExperiences(); setExperiences(ex.items ?? []); }
 async function refSk() { const sk = await listMySkills(); setSkills(sk.items ?? []); }

 async function addExp() {
 if (!nCo.trim() || !nPos.trim() || !nS) { notify("Заполни: компания, должность, дата начала", "err"); return; }
 const { error } = await addExperience({ company: nCo.trim(), position: nPos.trim(), start_date: nS, end_date: nE || null });
 if (error) { notify(error.message, "err"); return; }
 setNCo(""); setNPos(""); setNS(""); setNE(""); setAddingExp(false);
 await refEx(); notify("Опыт добавлен");
 }
 async function saveExp(x: Experience) {
 setSavingExpId(x.id);
 const { error } = await updateExperience(x.id, { company: x.company ?? null, position: x.position ?? null, start_date: x.start_date ?? null, end_date: x.end_date ?? null });
 setSavingExpId(null);
 if (error) { notify(error.message, "err"); return; }
 await refEx(); notify("Опыт сохранён");
 }
 async function delExp(id: string) {
 const { error } = await deleteExperience(id);
 if (error) { notify(error.message, "err"); return; }
 await refEx(); notify("Удалено");
 }
 async function addSk() {
 const name = sName.trim();
 if (!name) { notify("Введи название навыка", "err"); return; }
 const { error } = await addSkill(name, sLevel);
 if (error) { notify(error.message, "err"); return; }
 setSName(""); setSLevel("intermediate"); setAddingSkill(false);
 await refSk(); notify("Навык добавлен");
 }
 async function delSk(id: string) {
 const { error } = await deleteSkill(id);
 if (error) { notify(error.message, "err"); return; }
 await refSk();
 }

 const initials = fullName.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

 const inp: React.CSSProperties = {
 width: "100%", background: "#0f172a", border: "1px solid #1e293b",
 borderRadius: 8, padding: "10px 13px", color: "#e2e8f0", fontSize: 14,
 outline: "none", fontFamily: "inherit",
 };
 const card: React.CSSProperties = {
 background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
 padding: "24px 28px", marginBottom: 12,
 };
 const secTitle: React.CSSProperties = {
 fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 20,
 };
 const label: React.CSSProperties = {
 fontSize: 12, color: "#475569", marginBottom: 6, display: "block",
 };
 const btnPrimary: React.CSSProperties = {
 background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff",
 border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13,
 fontWeight: 600, cursor: "pointer",
 };
 const btnGhost: React.CSSProperties = {
 background: "transparent", border: "1px solid #1e293b", color: "#475569",
 borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer",
 };
 const divider: React.CSSProperties = {
 borderTop: "1px solid #1e293b", margin: "20px 0",
 };

 if (loading) return (
 <div style={{ minHeight: "100vh", background: "#080b14", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
 <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #1e293b", borderTopColor: "#6366f1", animation: "spin .7s linear infinite" }} />
 </div>
 );

 return (
 <div style={{ minHeight: "100vh", background: "#080b14", color: "#e2e8f0", fontFamily: "'DM Sans','Inter',sans-serif", paddingBottom: 80 }}>
 <style>{`
 @keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
 @keyframes spin{to{transform:rotate(360deg)}}
 input::placeholder,textarea::placeholder{color:#334155}
 select option{background:#0f172a}
 *{box-sizing:border-box}
 input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
 `}</style>

 {/* TOAST */}
 {toast && (
 <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: toast.type === "ok" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${toast.type === "ok" ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, borderRadius: 10, padding: "11px 18px", fontSize: 13, color: toast.type === "ok" ? "#4ade80" : "#f87171", backdropFilter: "blur(12px)", animation: "fadeDown .2s ease", display: "flex", alignItems: "center", gap: 8 }}>
 {toast.type === "ok" ? "" : ""} {toast.msg}
 </div>
 )}

 <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>

 {/* ── ШАПКА ПРОФИЛЯ ── */}
 <div style={{ ...card, marginBottom: 12 }}>
 <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>

 {/* Аватар */}
 <label style={{ cursor: "pointer", position: "relative", flexShrink: 0 }}>
 <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg,#1e1b4b,#312e81)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #312e81" }}>
 {profile?.avatar_url
 ? <img src={profile.avatar_url} alt="av" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
 : <span style={{ fontSize: 28, fontWeight: 700, color: "#a5b4fc" }}>{initials}</span>
 }
 </div>
 <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, opacity: 0, transition: "opacity .2s" }}
 onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
 onMouseLeave={e => (e.currentTarget.style.opacity = "0")}></div>
 <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
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

 {/* Имя и инфо */}
 <div style={{ flex: 1, minWidth: 160 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
 <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{fullName || "Мой профиль"}</h1>
 <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", background: "rgba(255,255,255,.04)", border: "1px solid #1e293b", borderRadius: 20, padding: "2px 10px 2px 8px" }}>
 <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusMeta.dot, display: "inline-block", boxShadow: `0 0 5px ${statusMeta.dot}` }} />
 {statusMeta.label}
 </span>
 </div>
 <div style={{ fontSize: 14, color: "#475569" }}>{headline}{headline && city ? " · " : ""}{city && ` ${city}`}</div>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
 {(expYears > 0 || expMonths > 0) && (
 <span style={{ fontSize: 12, color: "#818cf8", background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 20, padding: "3px 12px" }}>
 Стаж {expYears > 0 ? `${expYears} г ` : ""}{expMonths > 0 ? `${expMonths} мес` : ""}
 </span>
 )}
 {salaryNum && (
 <span style={{ fontSize: 12, color: "#fbbf24", background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.18)", borderRadius: 20, padding: "3px 12px" }}>
 {fmtNum(String(salaryNum))} {currency}
 </span>
 )}
 </div>
 </div>

 {/* Кнопки */}
 <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
 <div style={{ display: "flex", gap: 8 }}>
 <button onClick={() => router.push("/applications")} style={{ ...btnGhost, fontSize: 12, padding: "8px 14px" }}> Отклики</button>
 <button onClick={() => router.push("/jobs")} style={{ ...btnGhost, fontSize: 12, padding: "8px 14px" }}>Вакансии</button>
 <button onClick={() => window.open("/resume/print", "_blank")} style={{ ...btnGhost, fontSize: 12, padding: "8px 14px" }}>PDF</button>
 </div>
 </div>
 </div>

 {/* Прогресс */}
 <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #1e293b" }}>
 <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
 <span style={{ fontSize: 12, color: "#334155" }}>Заполненность резюме</span>
 <span style={{ fontSize: 12, fontWeight: 700, color: completeness === 100 ? "#4ade80" : "#818cf8" }}>{completeness}%</span>
 </div>
 <div style={{ height: 6, background: "#1e293b", borderRadius: 6, overflow: "hidden" }}>
 <div style={{ height: "100%", borderRadius: 6, width: `${completeness}%`, background: completeness === 100 ? "linear-gradient(90deg,#22c55e,#4ade80)" : "linear-gradient(90deg,#4f46e5,#818cf8)", transition: "width .6s ease" }} />
 </div>
 </div>
 </div>

 {/* ── ОСНОВНАЯ ИНФОРМАЦИЯ ── */}
 <div style={card}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
 <span style={secTitle}>Основная информация</span>
 </div>

 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 <div>
 <span style={label}>ФИО</span>
 <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя Фамилия Отчество" style={inp} />
 </div>
 <div>
 <span style={label}>Заголовок (должность)</span>
 <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Напр. Руководитель отдела продаж" style={inp} />
 </div>
 <div>
 <span style={label}>Город</span>
 <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ташкент" style={inp} />
 </div>
 </div>
 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 <div>
 <span style={label}>О себе</span>
 <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="Кратко о своём опыте, целях и сильных сторонах..." style={{ ...inp, height: 110, resize: "none" }} />
 </div>
 <div>
 <span style={label}>Статус поиска</span>
 <select value={status} onChange={e => setStatus(e.target.value as Status)} style={{ ...inp, cursor: "pointer" }}>
 {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
 </select>
 </div>
 </div>
 </div>

 <div style={divider} />

 {/* Зарплата */}
 <div>
 <span style={{ ...label, fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>Желаемая зарплата</span>
 <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
 <input inputMode="numeric" placeholder="15 000 000" value={salaryText} onChange={e => setSalaryText(fmtNum(e.target.value))} style={{ ...inp, maxWidth: 220 }} />
 <select value={currency} onChange={e => setCurrency(e.target.value as "UZS" | "USD")} style={{ ...inp, width: 90, cursor: "pointer" }}>
 <option value="UZS">UZS</option>
 <option value="USD">USD</option>
 </select>
 {salaryNum && <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{fmtNum(String(salaryNum))} {currency}</span>}
 </div>
 </div>

 <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
 <button onClick={saveProfile} disabled={savingProfile} style={{ ...btnPrimary, opacity: savingProfile ? .6 : 1, cursor: savingProfile ? "not-allowed" : "pointer" }}>
 {savingProfile ? "Сохраняю..." : "Сохранить изменения"}
 </button>
 </div>
 </div>

 {/* ── ОПЫТ РАБОТЫ ── */}
 <div style={card}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
 <span style={secTitle}>Опыт работы</span>
 <button onClick={() => setAddingExp(v => !v)} style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12 }}>
 {addingExp ? "Отмена" : "+ Добавить"}
 </button>
 </div>

 {(expYears > 0 || expMonths > 0) && (
 <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
 Общий стаж: <span style={{ color: "#818cf8", fontWeight: 600 }}>{expYears > 0 ? `${expYears} г ` : ""}{expMonths > 0 ? `${expMonths} мес` : ""}</span>
 </div>
 )}

 {/* Форма добавления */}
 {addingExp && (
 <div style={{ background: "#080b14", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8", marginBottom: 14 }}>Новое место работы</div>
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
 <div><span style={label}>Компания</span><input placeholder="Название компании" value={nCo} onChange={e => setNCo(e.target.value)} style={inp} /></div>
 <div><span style={label}>Должность</span><input placeholder="Ваша должность" value={nPos} onChange={e => setNPos(e.target.value)} style={inp} /></div>
 <div><span style={label}>Начало работы</span><input type="date" value={nS} onChange={e => setNS(e.target.value)} style={inp} /></div>
 <div><span style={label}>Конец работы</span><input type="date" value={nE} onChange={e => setNE(e.target.value)} style={{ ...inp, color: nE ? "#e2e8f0" : "#475569" }} /></div>
 </div>
 <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
 <button onClick={addExp} style={btnPrimary}>Добавить</button>
 <button onClick={() => setAddingExp(false)} style={btnGhost}>Отмена</button>
 </div>
 </div>
 )}

 {/* Список опыта */}
 {experiences.length === 0 && !addingExp ? (
 <div style={{ textAlign: "center", padding: "32px 0", color: "#1e293b" }}>
 <div style={{ fontSize: 32, marginBottom: 8 }}></div>
 <div style={{ fontSize: 14 }}>Добавьте опыт работы</div>
 </div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
 {experiences.map((x, i) => (
 <div key={x.id}>
 {i > 0 && <div style={divider} />}
 <div>
 {/* Просмотр */}
 <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
 <div>
 <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>{x.company || "Компания"}</div>
 <div style={{ fontSize: 14, color: "#818cf8", marginTop: 2 }}>{x.position || "Должность"}</div>
 <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
 {fmtDate(x.start_date)} — {fmtDate(x.end_date)}
 {calcDuration(x.start_date, x.end_date) && (
 <span style={{ marginLeft: 8, color: "#475569" }}>· {calcDuration(x.start_date, x.end_date)}</span>
 )}
 </div>
 </div>
 </div>
 {/* Редактирование */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
 <input placeholder="Компания" value={x.company ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, company: e.target.value } : ex))} style={inp} />
 <input placeholder="Должность" value={x.position ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, position: e.target.value } : ex))} style={inp} />
 <input type="date" value={x.start_date ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, start_date: e.target.value } : ex))} style={inp} />
 <input type="date" value={x.end_date ?? ""} onChange={e => setExperiences(p => p.map(ex => ex.id === x.id ? { ...ex, end_date: e.target.value } : ex))} style={inp} />
 </div>
 <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
 <button onClick={() => saveExp(x)} disabled={savingExpId === x.id} style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12, opacity: savingExpId === x.id ? .6 : 1 }}>
 {savingExpId === x.id ? "Сохраняю..." : "Сохранить"}
 </button>
 <button onClick={() => delExp(x.id)} style={{ ...btnGhost, padding: "8px 16px", fontSize: 12, color: "#f87171", borderColor: "rgba(239,68,68,.25)" }}>Удалить</button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── НАВЫКИ ── */}
 <div style={card}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
 <span style={secTitle}>Навыки</span>
 <button onClick={() => setAddingSkill(v => !v)} style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12 }}>
 {addingSkill ? "Отмена" : "+ Добавить"}
 </button>
 </div>

 {/* Форма добавления навыка */}
 {addingSkill && (
 <div style={{ background: "#080b14", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8", marginBottom: 14 }}>Новый навык</div>
 <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, alignItems: "end" }}>
 <div><span style={label}>Название</span><input placeholder="Напр. B2B продажи, CRM, Excel..." value={sName} onChange={e => setSName(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && addSk()} /></div>
 <div><span style={label}>Уровень</span><select value={sLevel} onChange={e => setSLevel(e.target.value as SkillLevel)} style={{ ...inp, cursor: "pointer" }}>{Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
 </div>
 <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
 <button onClick={addSk} style={btnPrimary}>Добавить</button>
 <button onClick={() => setAddingSkill(false)} style={btnGhost}>Отмена</button>
 </div>
 </div>
 )}

 {skills.length === 0 && !addingSkill ? (
 <div style={{ textAlign: "center", padding: "32px 0", color: "#1e293b" }}>
 <div style={{ fontSize: 32, marginBottom: 8 }}></div>
 <div style={{ fontSize: 14 }}>Добавьте навыки</div>
 </div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 {skills.map(s => (
 <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
 <div style={{ flex: 1 }}>
 <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
 <span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{s.name}</span>
 <span style={{ fontSize: 12, color: "#334155" }}>{LEVEL_LABELS[s.level]}</span>
 </div>
 <div style={{ height: 5, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
 <div style={{ height: "100%", width: `${LEVEL_PCT[s.level] ?? 60}%`, background: "linear-gradient(90deg,#4f46e5,#818cf8)", borderRadius: 5, transition: "width .4s" }} />
 </div>
 </div>
 <button onClick={() => delSk(s.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 16, padding: "4px 8px", borderRadius: 6, transition: "color .15s" }}
 onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
 onMouseLeave={e => (e.currentTarget.style.color = "#334155")}></button>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>
 </div>
 );
}
