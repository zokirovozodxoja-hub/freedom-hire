"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  jobs: { title: string | null } | null;
  candidate?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    headline: string | null;
    desired_position: string | null;
    job_search_status: string | null;
    salary_expectation: number | null;
    experience_years: number | null;
  };
  skills?: { name: string; level: string }[];
  lastExperience?: { company: string | null; position: string | null };
};

const STATUSES = [
  { key: "applied",     label: "Новый",        color: "rgba(196,173,255,0.15)", text: "#C4ADFF",  border: "rgba(196,173,255,0.3)" },
  { key: "in_progress", label: "Рассматриваю", color: "rgba(251,191,36,0.12)",  text: "#fbbf24",  border: "rgba(251,191,36,0.3)"  },
  { key: "invited",     label: "Приглашён",    color: "rgba(52,211,153,0.12)",  text: "#34d399",  border: "rgba(52,211,153,0.3)"  },
  { key: "rejected",    label: "Отказ",        color: "rgba(239,68,68,0.12)",   text: "#f87171",  border: "rgba(239,68,68,0.3)"   },
];

const MESSAGE_TEMPLATES: Record<string, string> = {
  in_progress: "Здравствуйте! Мы рассматриваем ваш отклик. Свяжемся с вами в ближайшее время.",
  invited:     "Здравствуйте! Приглашаем вас на собеседование. Когда вам будет удобно встретиться?",
  rejected:    "Здравствуйте! К сожалению, мы не можем предложить вам эту позицию. Спасибо за интерес к нашей компании.",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.key === status) ?? STATUSES[0];
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.color, color: s.text, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { loadApplications(); }, []);

  async function loadApplications() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/auth"); return; }

    const { data: company } = await supabase.from("companies").select("id").eq("owner_id", userData.user.id).maybeSingle();
    if (!company) { router.replace("/onboarding/employer"); return; }

    const { data: jobsList } = await supabase.from("jobs").select("id").eq("company_id", company.id);
    const jobIds = (jobsList ?? []).map((j) => j.id);
    if (jobIds.length === 0) { setApps([]); setLoading(false); return; }

    const { data } = await supabase.from("applications")
      .select("id,job_id,candidate_id,status,created_at,cover_letter,jobs(title)")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });

    const candidateIds = [...new Set((data ?? []).map((a) => a.candidate_id))];
    
    // ИСПРАВЛЕНИЕ 1: Добавлено логирование
    console.log("Loading profiles for candidates:", candidateIds);
    
    const { data: profiles, error: profilesErr } = await supabase.from("profiles")
      .select("id,full_name,email,phone,city,headline,desired_position,job_search_status,salary_expectation,experience_years")
      .in("id", candidateIds);
    
    // ИСПРАВЛЕНИЕ 2: Обработка ошибок загрузки профилей
    if (profilesErr) {
      console.error("Error loading profiles:", profilesErr);
    }
    
    console.log("Loaded profiles:", profiles?.length, "of", candidateIds.length);
    
    const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // ИСПРАВЛЕНИЕ 3: Проверка отсутствующих профилей
    candidateIds.forEach(id => {
      if (!profilesMap.has(id)) {
        console.warn("Missing profile for candidate:", id);
      }
    });

    // Загружаем навыки кандидатов
    const { data: allSkills, error: skillsErr } = await supabase.from("candidate_skills")
      .select("user_id,name,level")
      .in("user_id", candidateIds);
    
    if (skillsErr) {
      console.error("Error loading skills:", skillsErr);
    }
    
    const skillsMap = new Map<string, { name: string; level: string }[]>();
    (allSkills ?? []).forEach((s: any) => {
      if (!skillsMap.has(s.user_id)) skillsMap.set(s.user_id, []);
      skillsMap.get(s.user_id)!.push({ name: s.name, level: s.level });
    });

    // Загружаем последний опыт работы
    const { data: allExp, error: expErr } = await supabase.from("candidate_experiences")
      .select("profile_id,company,position,start_date")
      .in("profile_id", candidateIds)
      .order("start_date", { ascending: false });
    
    if (expErr) {
      console.error("Error loading experiences:", expErr);
    }
    
    const expMap = new Map<string, { company: string | null; position: string | null }>();
    (allExp ?? []).forEach((e: any) => {
      if (!expMap.has(e.profile_id)) {
        expMap.set(e.profile_id, { company: e.company, position: e.position });
      }
    });

    setApps((data ?? []).map((a) => ({
      ...a,
      candidate: profilesMap.get(a.candidate_id),
      skills: skillsMap.get(a.candidate_id) ?? [],
      lastExperience: expMap.get(a.candidate_id),
    })) as unknown as Application[]);
    setLoading(false);
  }

  function openModal(app: Application, status: string) {
    setSelectedApp(app);
    setNewStatus(status);
    setMessageText(MESSAGE_TEMPLATES[status] ?? "");
    setShowModal(true);
  }

  // ИСПРАВЛЕНИЕ 4: Улучшенная функция openChat с обработкой ошибок
  async function openChat(app: Application) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    try {
      // Попытка 1: Ищем по employer + candidate + job
      const { data: existingConv, error: err1 } = await supabase
        .from("conversations")
        .select("id")
        .eq("employer_id", userData.user.id)
        .eq("candidate_id", app.candidate_id)
        .eq("job_id", app.job_id)
        .maybeSingle();

      if (err1) {
        console.error("Error finding conversation:", err1);
      }
      
      if (existingConv) {
        router.push(`/chat/${existingConv.id}`);
        return;
      }

      // Попытка 2: Ищем по application_id
      const { data: convByApp, error: err2 } = await supabase
        .from("conversations")
        .select("id")
        .eq("application_id", app.id)
        .maybeSingle();

      if (err2) {
        console.error("Error finding conversation by app:", err2);
      }

      if (convByApp) {
        router.push(`/chat/${convByApp.id}`);
        return;
      }

      // Попытка 3: Ищем любой диалог между парой
      const { data: convByPair, error: err3 } = await supabase
        .from("conversations")
        .select("id")
        .eq("employer_id", userData.user.id)
        .eq("candidate_id", app.candidate_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err3) {
        console.error("Error finding conversation by pair:", err3);
      }

      if (convByPair) {
        router.push(`/chat/${convByPair.id}`);
        return;
      }

      // Создаём новый диалог
      const { data: newConv, error: createErr } = await supabase
        .from("conversations")
        .insert({
          employer_id: userData.user.id,
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          application_id: app.id,
        })
        .select("id")
        .single();

      if (createErr) {
        console.error("Error creating conversation:", createErr);
        alert(`Ошибка создания диалога: ${createErr.message}`);
        return;
      }

      if (newConv) {
        router.push(`/chat/${newConv.id}`);
      }
    } catch (err) {
      console.error("Unexpected error in openChat:", err);
      alert("Произошла ошибка при открытии чата");
    }
  }

  async function sendAndUpdate() {
    if (!selectedApp || !messageText.trim()) return;

    setSending(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSending(false); return; }

    try {
      // Обновляем статус отклика
      const { error: updateErr } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", selectedApp.id);

      if (updateErr) {
        console.error("Error updating application:", updateErr);
        alert(`Ошибка обновления статуса: ${updateErr.message}`);
        setSending(false);
        return;
      }

      // Ищем или создаём диалог
      let convId: string | null = null;

      // Попытка 1: по employer + candidate + job
      const { data: conv1 } = await supabase
        .from("conversations")
        .select("id")
        .eq("employer_id", userData.user.id)
        .eq("candidate_id", selectedApp.candidate_id)
        .eq("job_id", selectedApp.job_id)
        .maybeSingle();

      if (conv1) {
        convId = conv1.id;
      } else {
        // Попытка 2: по application_id
        const { data: conv2 } = await supabase
          .from("conversations")
          .select("id")
          .eq("application_id", selectedApp.id)
          .maybeSingle();

        if (conv2) {
          convId = conv2.id;
        } else {
          // Создаём новый диалог
          const { data: newConv, error: convErr } = await supabase
            .from("conversations")
            .insert({
              employer_id: userData.user.id,
              candidate_id: selectedApp.candidate_id,
              job_id: selectedApp.job_id,
              application_id: selectedApp.id,
            })
            .select("id")
            .single();

          if (convErr) {
            console.error("Error creating conversation:", convErr);
            alert(`Ошибка создания диалога: ${convErr.message}`);
            setSending(false);
            return;
          }

          if (newConv) convId = newConv.id;
        }
      }

      // Отправляем сообщение
      if (convId && messageText.trim()) {
        const { error: msgErr } = await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: userData.user.id,
          content: messageText.trim(),
        });

        if (msgErr) {
          console.error("Error sending message:", msgErr);
          alert(`Ошибка отправки сообщения: ${msgErr.message}`);
        }
      }

      // Перезагружаем список откликов
      await loadApplications();
      setShowModal(false);
      setSelectedApp(null);
    } catch (err) {
      console.error("Unexpected error in sendAndUpdate:", err);
      alert("Произошла непредвиденная ошибка");
    }

    setSending(false);
  }

  const filtered = apps.filter((a) => !filter || a.status === filter);
  const counts = STATUSES.map((s) => ({ ...s, count: apps.filter((a) => a.status === s.key).length }));

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-4 pt-4">
          {[140, 160, 180].map((h, i) => (
            <div key={i} className="brand-card rounded-2xl animate-pulse" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl mb-1" style={{ color: "var(--chalk)" }}>
          Отклики кандидатов
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          Управляйте откликами на ваши вакансии
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFilter("")}
            className={`px-3 py-1.5 text-xs font-body rounded-xl transition ${!filter ? "btn-primary text-white" : ""}`}
            style={!filter ? {} : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Все ({apps.length})
          </button>
          {counts.map((s) => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className="px-3 py-1.5 text-xs font-body rounded-xl transition"
              style={{
                background: filter === s.key ? s.color : "rgba(255,255,255,0.05)",
                color: filter === s.key ? s.text : "rgba(255,255,255,0.6)",
                border: filter === s.key ? `1px solid ${s.border}` : "1px solid rgba(255,255,255,0.08)",
              }}>
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Applications */}
        {filtered.length === 0 ? (
          <div className="brand-card rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-body" style={{ color: "rgba(255,255,255,0.4)" }}>
              {filter ? "Нет откликов с таким статусом" : "Пока нет откликов"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              // ИСПРАВЛЕНИЕ 5: Улучшенный fallback для имени
              const name = app.candidate?.full_name || 
                           app.candidate?.email || 
                           `Кандидат ${app.candidate_id.slice(0, 8)}`;
              
              // ИСПРАВЛЕНИЕ 6: Проверка наличия профиля
              if (!app.candidate) {
                console.error("No candidate profile for application:", app.id, "candidate_id:", app.candidate_id);
              }
              
              const statusLabels: Record<string, { label: string; color: string }> = {
                actively_looking: { label: "Активно ищет", color: "#4ade80" },
                open_to_offers: { label: "Открыт к предложениям", color: "#C4ADFF" },
                not_looking: { label: "Не ищет", color: "#6b7280" },
              };
              const searchStatus = statusLabels[app.candidate?.job_search_status ?? ""];
              return (
                <div key={app.id} className="brand-card rounded-2xl p-5">
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
                      style={{ background: "rgba(92,46,204,0.25)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
                      {name[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <h3 className="font-body font-semibold text-white text-lg">{name}</h3>
                          {(app.candidate?.headline || app.candidate?.desired_position) && (
                            <div className="text-sm" style={{ color: "var(--lavender)" }}>
                              {app.candidate.headline || app.candidate.desired_position}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={app.status} />
                      </div>

                      {/* Meta info row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                        {app.candidate?.city && (
                          <span className="text-xs px-2 py-1 rounded-lg font-body"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
                            📍 {app.candidate.city}
                          </span>
                        )}
                        {app.candidate?.experience_years && (
                          <span className="text-xs px-2 py-1 rounded-lg font-body"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
                            💼 {app.candidate.experience_years} лет опыта
                          </span>
                        )}
                        {app.candidate?.salary_expectation && (
                          <span className="text-xs px-2 py-1 rounded-lg font-body"
                            style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold)" }}>
                            💰 {app.candidate.salary_expectation.toLocaleString("ru-RU")} сум
                          </span>
                        )}
                        {searchStatus && (
                          <span className="text-xs px-2 py-1 rounded-lg font-body"
                            style={{ background: "rgba(255,255,255,0.05)", color: searchStatus.color }}>
                            ● {searchStatus.label}
                          </span>
                        )}
                      </div>

                      {/* Last experience */}
                      {app.lastExperience?.position && (
                        <div className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                          <span style={{ color: "rgba(255,255,255,0.7)" }}>{app.lastExperience.position}</span>
                          {app.lastExperience.company && (
                            <span> в {app.lastExperience.company}</span>
                          )}
                        </div>
                      )}

                      {/* Skills */}
                      {app.skills && app.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {app.skills.slice(0, 5).map((skill, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(124,58,237,0.12)", color: "#C4ADFF", border: "1px solid rgba(124,58,237,0.2)" }}>
                              {skill.name}
                            </span>
                          ))}
                          {app.skills.length > 5 && (
                            <span className="text-xs px-2 py-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                              +{app.skills.length - 5}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Job & date */}
                      <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                        На вакансию: <span className="text-white/60">{app.jobs?.title ?? "—"}</span>
                        {" · "}
                        {new Date(app.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>

                      {app.cover_letter && (
                        <div className="text-sm rounded-xl px-3 py-2 mb-3 line-clamp-2"
                          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {app.cover_letter}
                        </div>
                      )}

                      {/* Contacts */}
                      <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {app.candidate?.email && <span>✉️ {app.candidate.email}</span>}
                        {app.candidate?.phone && <span>📞 {app.candidate.phone}</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/candidates/${app.candidate_id}`}
                          className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white">
                          Полный профиль →
                        </Link>
                        <button
                          onClick={() => openChat(app)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-body transition"
                          style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.04)" }}>
                          💬 Написать
                        </button>

                        <div className="ml-auto flex flex-wrap gap-1.5">
                          {STATUSES.filter((s) => s.key !== app.status).map((s) => (
                            <button key={s.key} onClick={() => openModal(app, s.key)}
                              className="rounded-xl px-3 py-1.5 text-xs font-body transition"
                              style={{ background: s.color, color: s.text, border: `1px solid ${s.border}` }}>
                              → {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(7,6,15,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="brand-card rounded-3xl p-6 w-full max-w-lg"
            style={{ border: "1px solid rgba(196,173,255,0.2)" }}>
            <h3 className="font-display text-xl mb-1" style={{ color: "var(--chalk)" }}>
              Сменить статус и отправить сообщение
            </h3>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Статус изменится на: <StatusBadge status={newStatus} />
            </p>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              placeholder="Введите сообщение кандидату..."
              className="w-full rounded-xl px-4 py-3 text-sm font-body text-white placeholder-white/25 focus:outline-none resize-none transition"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.15)" }}
            />

            <div className="flex gap-3 mt-4">
              <button onClick={sendAndUpdate} disabled={sending}
                className="btn-primary flex-1 rounded-xl py-2.5 font-semibold text-white text-sm disabled:opacity-60">
                {sending ? "Отправка..." : "Подтвердить →"}
              </button>
              <button onClick={() => { setShowModal(false); setSelectedApp(null); }}
                className="rounded-xl px-5 py-2.5 text-sm font-body transition"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.04)" }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
