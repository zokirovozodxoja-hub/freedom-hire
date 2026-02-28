"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: "user" | "job" | null;
  target_id: string | null;
  reason: string | null;
  status: "open" | "resolved" | "dismissed" | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Открыта",
  resolved: "Решена",
  dismissed: "Отклонена",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-white/10 text-white/40",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("reports")
      .select("id,reporter_id,target_type,target_id,reason,status,created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") q = q.eq("status", filter);

    const { data, error } = await q;
    if (!error) setReports((data ?? []) as Report[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    const supabase = createClient();
    await supabase.from("reports").update({ status }).eq("id", id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: status as Report["status"] } : r));
    setActionLoading(null);
  }

  const filters = ["all", "open", "resolved", "dismissed"] as const;
  const filterLabels = { all: "Все", open: "Открытые", resolved: "Решённые", dismissed: "Отклонённые" };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-black">Жалобы</h1>
        <div className="flex gap-2 ml-auto flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? "bg-[#7c3aed] text-white" : "bg-white/8 text-white/70 hover:text-white"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
          {filter === "open" ? "Открытых жалоб нет 🎉" : "Жалоб не найдено"}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status ?? "open"] ?? STATUS_COLORS.open}`}>
                      {STATUS_LABELS[r.status ?? "open"] ?? r.status}
                    </span>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                      {r.target_type === "user" ? "👤 Пользователь" : r.target_type === "job" ? "💼 Вакансия" : "—"}
                    </span>
                    <span className="text-xs text-white/40">{formatDate(r.created_at)}</span>
                  </div>

                  <div className="mt-2 text-sm text-white/80">
                    <span className="text-white/40">Причина: </span>
                    {r.reason ?? <span className="text-white/30 italic">не указана</span>}
                  </div>

                  <div className="mt-1 text-xs text-white/40 font-mono">
                    target_id: {r.target_id ?? "—"}
                  </div>
                </div>

                {r.status === "open" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => updateStatus(r.id, "resolved")}
                      className="px-3 py-1.5 rounded-xl text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50"
                    >
                      Решить
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => updateStatus(r.id, "dismissed")}
                      className="px-3 py-1.5 rounded-xl text-sm bg-white/8 text-white/50 hover:bg-white/15 transition disabled:opacity-50"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
