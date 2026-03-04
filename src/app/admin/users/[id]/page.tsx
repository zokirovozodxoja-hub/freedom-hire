"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
 id: string;
 email: string;
 full_name: string | null;
 role: string;
 city: string | null;
 phone: string | null;
 telegram: string | null;
 is_blocked: boolean | null;
 is_onboarded: boolean | null;
 created_at: string;
 updated_at: string | null;
 avatar_url: string | null;
 bio: string | null;
 about: string | null;
 headline: string | null;
 position: string | null;
 experience_years: number | null;
 job_search_status: string | null;
 salary_expectation: number | null;
 salary_currency: string | null;
};

type Experience = {
 id: string;
 company: string | null;
 position: string | null;
 start_date: string | null;
 end_date: string | null;
 is_current: boolean | null;
 description: string | null;
};

type Skill = {
 id: string;
 name: string | null;
 level: string | null;
};

type Application = {
 id: string;
 created_at: string;
 status: string;
 job: { title: string | null; company: { name: string | null } | null } | null;
};

type Company = {
 id: string;
 name: string | null;
 inn: string | null;
 address: string | null;
 verification_status: string | null;
 created_at: string;
};

type SavedJob = {
 id: string;
 created_at: string;
 job: { title: string | null } | null;
};

const JOB_STATUS_LABELS: Record<string, string> = {
 actively_looking: " Активно ищу работу",
 open_to_offers: " Рассматриваю предложения",
 not_looking: " Не ищу работу",
};

const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
 pending: { label: " На проверке", color: "#fbbf24" },
 approved: { label: " Одобрено", color: "#34d399" },
 rejected: { label: " Отклонено", color: "#f87171" },
};

const APP_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
 new: { label: "Новый", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" },
 reviewing: { label: "На рассмотрении",bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
 accepted: { label: "Принят", bg: "rgba(52,211,153,0.15)", color: "#6ee7b7" },
 rejected: { label: "Отказ", bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

function formatDate(iso: string | null) {
 if (!iso) return "—";
 return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(iso: string | null) {
 if (!iso) return "—";
 return new Date(iso).toLocaleString("ru-RU", {
 day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
 });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
 if (!value) return null;
 return (
 <div className="flex gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
 <span className="text-xs w-40 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
 <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{value}</span>
 </div>
 );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
 return (
 <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
 <h2 className="font-semibold mb-4 flex items-center gap-2">
 <span>{icon}</span>
 <span>{title}</span>
 </h2>
 {children}
 </div>
 );
}

export default function AdminUserDetailPage() {
 const { id } = useParams<{ id: string }>();
 const router = useRouter();

 const [profile, setProfile] = useState<Profile | null>(null);
 const [experiences, setExperiences] = useState<Experience[]>([]);
 const [skills, setSkills] = useState<Skill[]>([]);
 const [applications, setApplications] = useState<Application[]>([]);
 const [company, setCompany] = useState<Company | null>(null);
 const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
 const [loading, setLoading] = useState(true);
 const [deleting, setDeleting] = useState(false);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 async function load() {
 const supabase = createClient();

 const [
 { data: prof },
 { data: exp },
 { data: sk },
 { data: apps },
 { data: comp },
 { data: saved },
 ] = await Promise.all([
 supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
 supabase.from("candidate_experiences").select("*").eq("profile_id", id).order("start_date", { ascending: false }),
 supabase.from("candidate_skills").select("*").eq("user_id", id),
 supabase.from("applications")
 .select("id, created_at, status, job:jobs(title, company:companies(name))")
 .eq("user_id", id)
 .order("created_at", { ascending: false }),
 supabase.from("companies").select("id,name,inn,address,verification_status,created_at").eq("owner_id", id).maybeSingle(),
 supabase.from("saved_jobs").select("id, created_at, job:jobs(title)").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
 ]);

 setProfile(prof);
 setExperiences(exp ?? []);
 setSkills(sk ?? []);
 setApplications((apps ?? []) as unknown as Application[]);
 setCompany(comp ?? null);
 setSavedJobs((saved ?? []) as unknown as SavedJob[]);
 setLoading(false);
 }
 load();
 }, [id]);

 async function toggleBlocked() {
 if (!profile) return;
 const supabase = createClient();
 const next = !profile.is_blocked;
 const { error: err } = await supabase.from("profiles").update({ is_blocked: next }).eq("id", id);
 if (err) { setError(err.message); return; }
 setProfile({ ...profile, is_blocked: next });
 }

 async function deleteUser() {
 if (!profile) return;
 setDeleting(true);
 setError(null);
 const supabase = createClient();

 // Delete related data first
 await Promise.all([
 supabase.from("candidate_experiences").delete().eq("profile_id", id),
 supabase.from("candidate_skills").delete().eq("user_id", id),
 supabase.from("applications").delete().eq("user_id", id),
 supabase.from("saved_jobs").delete().eq("user_id", id),
 ]);

 // Delete profile
 const { error: profErr } = await supabase.from("profiles").delete().eq("id", id);
 if (profErr) {
 setError("Не удалось удалить профиль: " + profErr.message);
 setDeleting(false);
 return;
 }

 // Delete auth user via admin API (requires service role — if not available, skip)
 // This removes the profile; the user can re-register with the same email
 router.push("/admin/users");
 }

 // Onboarding progress calculation
 function getOnboardingProgress() {
 if (!profile) return { steps: [], percent: 0 };

 if (profile.role === "candidate") {
 const steps = [
 { label: "Основное", done: !!(profile.full_name || profile.headline || profile.city) },
 { label: "Статус и зарплата", done: !!(profile.job_search_status) },
 { label: "Контакты", done: !!(profile.phone || profile.telegram) },
 { label: "Опыт работы", done: experiences.length > 0 },
 { label: "Навыки", done: skills.length > 0 },
 ];
 const done = steps.filter((s) => s.done).length;
 return { steps, percent: Math.round((done / steps.length) * 100) };
 }

 if (profile.role === "employer") {
 const steps = [
 { label: "Аккаунт создан", done: true },
 { label: "Компания создана", done: !!company },
 { label: "Верификация", done: company?.verification_status === "approved" },
 { label: "Вакансии добавлены", done: false }, // can't easily check here
 ];
 const done = steps.filter((s) => s.done).length;
 return { steps, percent: Math.round((done / steps.length) * 100) };
 }

 return { steps: [], percent: 0 };
 }

 if (loading) return <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="brand-card rounded-xl animate-pulse" style={{height:80}} />)}</div>;
 if (!profile) return <div className="text-white/40 p-8">Пользователь не найден</div>;

 const initials = (profile.full_name || profile.email)[0].toUpperCase();
 const { steps: progressSteps, percent: progressPercent } = getOnboardingProgress();
 const isCandidate = profile.role === "candidate";
 const isEmployer = profile.role === "employer";

 return (
 <div className="max-w-3xl">
 {/* Back */}
 <Link href="/admin/users" className="flex items-center gap-1 text-sm mb-6" style={{ color: "#C4ADFF" }}>
 ← Все пользователи
 </Link>

 {/* ══════════ HEADER ══════════ */}
 <div className="rounded-2xl p-6 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
 <div className="flex items-start gap-5">
 <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
 style={{ background: isEmployer ? "rgba(59,130,246,0.3)" : "rgba(124,58,237,0.3)" }}>
 {initials}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 flex-wrap">
 <h1 className="text-xl font-bold">{profile.full_name ?? "Без имени"}</h1>
 {profile.is_blocked && (
 <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
 Заблокирован
 </span>
 )}
 <span className="text-xs px-2 py-0.5 rounded-full"
 style={{ background: isEmployer ? "rgba(59,130,246,0.15)" : "rgba(124,58,237,0.15)",
 color: isEmployer ? "#93c5fd" : "#c4b5fd" }}>
 {isEmployer ? "Работодатель" : "Соискатель"}
 </span>
 </div>
 {profile.headline && (
 <div className="mt-0.5 text-sm font-medium" style={{ color: "#C4ADFF" }}>{profile.headline}</div>
 )}
 <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile.email}</div>
 <div className="mt-1 flex flex-wrap gap-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
 {profile.city && <span> {profile.city}</span>}
 {profile.phone && <span> {profile.phone}</span>}
 {profile.telegram && <span> {profile.telegram}</span>}
 <span> {formatDate(profile.created_at)}</span>
 </div>
 </div>
 <div className="flex flex-col gap-2 shrink-0">
 <button onClick={toggleBlocked}
 className="px-4 py-2 rounded-xl text-sm font-medium transition"
 style={{
 background: profile.is_blocked ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
 color: profile.is_blocked ? "#6ee7b7" : "#f87171",
 border: profile.is_blocked ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(239,68,68,0.3)",
 }}>
 {profile.is_blocked ? "Разблокировать" : "Заблокировать"}
 </button>
 {!confirmDelete ? (
 <button onClick={() => setConfirmDelete(true)}
 className="px-4 py-2 rounded-xl text-sm font-medium transition"
 style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
 Удалить
 </button>
 ) : (
 <div className="flex flex-col gap-1">
 <div className="text-xs text-red-300 text-center">Удалить аккаунт?</div>
 <div className="flex gap-1">
 <button onClick={deleteUser} disabled={deleting}
 className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
 style={{ background: "rgba(239,68,68,0.3)", color: "#f87171" }}>
 {deleting ? "..." : "Да"}
 </button>
 <button onClick={() => setConfirmDelete(false)}
 className="flex-1 px-3 py-1.5 rounded-lg text-xs transition"
 style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
 Нет
 </button>
 </div>
 </div>
 )}
 </div>
 </div>

 {error && (
 <div className="mt-3 rounded-xl px-4 py-2 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
 {error}
 </div>
 )}
 </div>

 {/* ══════════ ONBOARDING PROGRESS ══════════ */}
 <Section icon="chart" title="Прогресс заполнения профиля">
 <div className="mb-3 flex items-center justify-between text-sm">
 <span style={{ color: "rgba(255,255,255,0.5)" }}>Заполнено</span>
 <span className="font-semibold" style={{ color: progressPercent === 100 ? "#34d399" : "#fbbf24" }}>
 {progressPercent}%
 </span>
 </div>
 <div className="h-2 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.08)" }}>
 <div className="h-2 rounded-full transition-all"
 style={{
 width: `${progressPercent}%`,
 background: progressPercent === 100 ? "#34d399" : progressPercent >= 50 ? "#fbbf24" : "#f87171"
 }} />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {progressSteps.map((step) => (
 <div key={step.label} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2"
 style={{ background: step.done ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${step.done ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.15)"}` }}>
 <span>{step.done ? "+" : "-"}</span>
 <span style={{ color: step.done ? "#6ee7b7" : "#f87171", fontSize: "12px" }}>{step.label}</span>
 </div>
 ))}
 </div>
 {!profile.is_onboarded && (
 <div className="mt-3 text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
 Онбординг не завершён — пользователь не дошёл до конца регистрации
 </div>
 )}
 </Section>

 {/* ══════════ PROFILE DETAILS ══════════ */}
 <Section icon="chart" title="Данные профиля">
 <InfoRow label="ID пользователя" value={<span className="font-mono text-xs opacity-60">{profile.id}</span>} />
 <InfoRow label="Email" value={profile.email} />
 <InfoRow label="Роль" value={isEmployer ? "Работодатель" : "Соискатель"} />
 <InfoRow label="Имя" value={profile.full_name} />
 <InfoRow label="Должность" value={profile.headline} />
 <InfoRow label="Город" value={profile.city} />
 <InfoRow label="Телефон" value={profile.phone} />
 <InfoRow label="Telegram" value={profile.telegram} />
 <InfoRow label="О себе" value={profile.about || profile.bio} />
 <InfoRow label="Зарегистрирован" value={formatDateTime(profile.created_at)} />
 <InfoRow label="Обновлён" value={formatDateTime(profile.updated_at)} />
 <InfoRow label="Онбординг" value={profile.is_onboarded ? " Завершён" : " Не пройден"} />
 <InfoRow label="Статус" value={profile.is_blocked ? " Заблокирован" : " Активен"} />
 {isCandidate && (
 <>
 <InfoRow label="Статус поиска" value={JOB_STATUS_LABELS[profile.job_search_status ?? ""] ?? profile.job_search_status} />
 <InfoRow
 label="Желаемая зарплата"
 value={profile.salary_expectation ? `${profile.salary_expectation.toLocaleString("ru-RU")} ${profile.salary_currency ?? "UZS"}` : null}
 />
 </>
 )}
 </Section>

 {/* ══════════ EMPLOYER: COMPANY ══════════ */}
 {isEmployer && (
 <Section icon="chart" title="Компания">
 {company ? (
 <>
 <InfoRow label="Название" value={company.name} />
 <InfoRow label="ИНН" value={company.inn} />
 <InfoRow label="Адрес" value={company.address} />
 <InfoRow label="Статус верификации" value={
 <span style={{ color: VERIFICATION_LABELS[company.verification_status ?? ""]?.color ?? "inherit" }}>
 {VERIFICATION_LABELS[company.verification_status ?? ""]?.label ?? company.verification_status ?? "—"}
 </span>
 } />
 <InfoRow label="Дата создания" value={formatDateTime(company.created_at)} />
 </>
 ) : (
 <div className="text-sm py-2" style={{ color: "rgba(255,255,255,0.3)" }}>
 Компания не создана — работодатель не завершил онбординг
 </div>
 )}
 </Section>
 )}

 {/* ══════════ EXPERIENCE ══════════ */}
 {isCandidate && (
 <Section icon="chart" title={`Опыт работы (${experiences.length})`}>
 {experiences.length === 0 ? (
 <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Не добавлен</div>
 ) : (
 <div className="space-y-4">
 {experiences.map((e) => (
 <div key={e.id} className="pl-3" style={{ borderLeft: "2px solid rgba(124,74,232,0.4)" }}>
 <div className="font-medium text-sm">{e.position ?? "—"}</div>
 <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{e.company}</div>
 <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
 {e.start_date ?? "?"} — {e.is_current ? "по настоящее время" : (e.end_date ?? "—")}
 </div>
 {e.description && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{e.description}</p>}
 </div>
 ))}
 </div>
 )}
 </Section>
 )}

 {/* ══════════ SKILLS ══════════ */}
 {isCandidate && (
 <Section icon="chart" title={`Навыки (${skills.length})`}>
 {skills.length === 0 ? (
 <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Не добавлены</div>
 ) : (
 <div className="flex flex-wrap gap-2">
 {skills.map((s) => (
 <span key={s.id} className="px-3 py-1 rounded-full text-sm"
 style={{ background: "rgba(124,74,232,0.15)", border: "1px solid rgba(124,74,232,0.3)", color: "#C4ADFF" }}>
 {s.name}
 {s.level && <span className="ml-1 opacity-50 text-xs">· {s.level}</span>}
 </span>
 ))}
 </div>
 )}
 </Section>
 )}

 {/* ══════════ APPLICATIONS ══════════ */}
 {isCandidate && (
 <Section icon="chart" title={`Отклики (${applications.length})`}>
 {applications.length === 0 ? (
 <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Откликов нет</div>
 ) : (
 <div className="space-y-2">
 {applications.map((a) => {
 const st = APP_STATUS_LABELS[a.status] ?? { label: a.status, bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" };
 return (
 <div key={a.id} className="flex items-center justify-between text-sm py-2"
 style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
 <div>
 <div className="font-medium">{a.job?.title ?? "—"}</div>
 <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
 {(a.job as any)?.company?.name} · {formatDateTime(a.created_at)}
 </div>
 </div>
 <span className="px-2 py-0.5 rounded-full text-xs shrink-0 ml-3" style={{ background: st.bg, color: st.color }}>
 {st.label}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </Section>
 )}

 {/* ══════════ SAVED JOBS ══════════ */}
 {isCandidate && savedJobs.length > 0 && (
 <Section icon="chart" title={`Сохранённые вакансии (${savedJobs.length})`}>
 <div className="space-y-1">
 {savedJobs.map((s) => (
 <div key={s.id} className="flex items-center justify-between text-sm py-1.5"
 style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
 <span>{(s.job as any)?.title ?? "—"}</span>
 <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{formatDate(s.created_at)}</span>
 </div>
 ))}
 </div>
 </Section>
 )}
 </div>
 );
}
