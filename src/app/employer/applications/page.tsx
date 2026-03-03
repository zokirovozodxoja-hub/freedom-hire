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
    desired_position: string | null;
  };
};

const STATUSES = [
  { key: "applied", label: "Новый" },
  { key: "in_progress", label: "Рассматриваю" },
  { key: "invited", label: "Приглашён" },
  { key: "rejected", label: "Отказ" },
];

// ШАБЛОНЫ СООБЩЕНИЙ
const MESSAGE_TEMPLATES: Record<string, string> = {
  in_progress: "Здравствуйте! Мы рассматриваем ваш отклик. Свяжемся с вами в ближайшее время.",
  invited: "Здравствуйте! Приглашаем вас на собеседование. Когда вам будет удобно встретиться?",
  rejected: "Здравствуйте! К сожалению, мы не можем предложить вам эту позицию. Спасибо за интерес к нашей компании.",
};

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("");
  
  // Модалка для отправки сообщения
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/auth"); return; }

    const { data: company } = await supabase.from("companies").select("id").eq("owner_id", userData.user.id).maybeSingle();
    if (!company) { router.replace("/onboarding/employer"); return; }

    const { data: jobsList } = await supabase.from("jobs").select("id").eq("company_id", company.id);
    const jobIds = (jobsList ?? []).map((j) => j.id);
    if (jobIds.length === 0) { setApps([]); setLoading(false); return; }

    const { data } = await supabase.from("applications").select("id,job_id,candidate_id,status,created_at,cover_letter,jobs(title)").in("job_id", jobIds).order("created_at", { ascending: false });
    const candidateIds = [...new Set((data ?? []).map((app) => app.candidate_id))];
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,email,phone,city,desired_position").in("id", candidateIds);
    const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const appsWithProfiles = (data ?? []).map((app) => ({ ...app, candidate: profilesMap.get(app.candidate_id) }));

    setApps(appsWithProfiles as unknown as Application[]);
    setLoading(false);
  }

  async function handleStatusChange(app: Application, status: string) {
    // Если меняем статус - показываем модалку с шаблоном
    setSelectedApp(app);
    setNewStatus(status);
    setMessageText(MESSAGE_TEMPLATES[status] || "");
    setShowMessageModal(true);
  }

  async function sendMessageAndUpdateStatus() {
    if (!selectedApp) return;
    
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // 1. Отправляем сообщение
    await supabase.from("messages").insert({
      application_id: selectedApp.id,
      sender_id: userData.user.id,
      receiver_id: selectedApp.candidate_id,
      message: messageText,
    });

    // 2. Обновляем статус
    await supabase.from("applications").update({ status: newStatus }).eq("id", selectedApp.id);
    setApps((prev) => prev.map((a) => (a.id === selectedApp.id ? { ...a, status: newStatus } : a)));

    // Закрываем модалку
    setShowMessageModal(false);
    setSelectedApp(null);
    setMessageText("");
  }

  const filtered = filter ? apps.filter((a) => a.status === filter) : apps;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Отклики кандидатов</h1>
          
          {/* Фильтры */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter("")} className={`px-4 py-2 rounded-lg font-medium transition ${!filter ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"}`}>
              Все ({apps.length})
            </button>
            {STATUSES.map((s) => {
              const count = apps.filter((a) => a.status === s.key).length;
              return (
                <button key={s.key} onClick={() => setFilter(s.key)} className={`px-4 py-2 rounded-lg font-medium transition ${filter === s.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"}`}>
                  {s.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Список */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500">Откликов пока нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              const name = app.candidate?.full_name || app.candidate?.email || "Кандидат";
              return (
                <div key={app.id} className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {name[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">{name}</h3>
                      {app.candidate?.desired_position && (
                        <p className="text-sm text-blue-600 mb-2">{app.candidate.desired_position}</p>
                      )}

                      <div className="text-sm text-gray-600 mb-3">
                        <span>{app.candidate?.email}</span>
                        {app.candidate?.phone && <span> • {app.candidate.phone}</span>}
                        {app.candidate?.city && <span> • {app.candidate.city}</span>}
                      </div>

                      <p className="text-xs text-gray-500 mb-3">На вакансию: {app.jobs?.title ?? "—"}</p>

                      {/* Действия */}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/candidates/${app.candidate_id}`} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
                          Профиль
                        </Link>
                        <Link href={`/chat/${app.id}`} className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition">
                          Написать
                        </Link>
                      </div>
                    </div>

                    {/* Статусы - кнопки */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {STATUSES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => handleStatusChange(app, s.key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            app.status === s.key
                              ? "bg-blue-100 border-2 border-blue-600 text-blue-700"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Модалка для отправки сообщения */}
        {showMessageModal && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Отправить сообщение кандидату
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Статус будет изменён на: <strong>{STATUSES.find(s => s.key === newStatus)?.label}</strong>
              </p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Введите сообщение..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={sendMessageAndUpdateStatus}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  Отправить и изменить статус
                </button>
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedApp(null);
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
