"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const STATUSES = [
  { key: "applied", label: "Откликнулся" },
  { key: "in_progress", label: "В процессе" },
  { key: "rejected", label: "Отказ" },
  { key: "invited", label: "Приглашение" },
];

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        router.replace("/auth?role=employer");
        return;
      }

      // просто пробуем select — RLS уже ограничит доступ
      const { data, error } = await supabase
        .from("applications")
        .select("id, job_id, candidate_id, cover_letter, status, created_at");

      if (error) setMsg(error.message);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  async function updateStatus(appId: string, status: string) {
    setMsg(null);
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) {
      setMsg(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === appId ? { ...r, status } : r)));
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
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Отклики</h1>
            {msg ? <div className="text-white/70 mt-2">{msg}</div> : null}
          </div>

          <button
            onClick={() => router.push("/employer")}
            className="bg-white/10 border border-white/10 px-5 py-2 rounded-2xl"
          >
            Назад
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <div className="text-white/70">Пока откликов нет</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-white/70 text-sm">
                  job_id: {r.job_id} · candidate_id: {r.candidate_id}
                </div>

                {r.cover_letter ? (
                  <div className="text-white/70 mt-2 whitespace-pre-wrap">{r.cover_letter}</div>
                ) : (
                  <div className="text-white/50 mt-2 text-sm">Сопроводительное письмо не указано</div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="text-sm text-white/70">Статус:</div>
                  <select
                    value={r.status ?? "applied"}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="rounded-2xl bg-black/20 border border-white/10 px-4 py-2 outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
