"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuditLog = {
  id: string;
  admin_id: string | null;
  action: string | null;
  entity: string | null;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  ban: "bg-red-500/20 text-red-400",
  unban: "bg-emerald-500/20 text-emerald-400",
  approve: "bg-emerald-500/20 text-emerald-400",
  reject: "bg-orange-500/20 text-orange-400",
  role_change: "bg-violet-500/20 text-violet-400",
  delete: "bg-red-500/20 text-red-400",
  hide: "bg-yellow-500/20 text-yellow-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_logs")
        .select("id,admin_id,action,entity,entity_id,before,after,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data ?? []) as AuditLog[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-black">Аудит действий</h1>
        <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
          последние 100 записей
        </span>
      </div>

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
          Действий пока нет
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expanded === log.id;
            const actionColor = ACTION_COLORS[log.action ?? ""] ?? "bg-white/10 text-white/60";

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/3 transition"
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                >
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${actionColor}`}>
                    {log.action ?? "—"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white/80">
                      {log.entity ?? "—"}
                      {log.entity_id && (
                        <span className="text-white/40 font-mono ml-1">#{log.entity_id.slice(0, 8)}</span>
                      )}
                    </span>
                  </div>

                  <div className="shrink-0 text-xs text-white/40">
                    {formatDate(log.created_at)}
                  </div>

                  <svg
                    className={`shrink-0 h-4 w-4 text-white/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-3">
                    <div className="text-xs text-white/50 font-mono">
                      admin_id: {log.admin_id ?? "—"}
                    </div>

                    {log.before && (
                      <div>
                        <div className="text-xs text-white/40 mb-1">До:</div>
                        <pre className="text-xs text-white/60 bg-black/30 rounded-xl p-3 overflow-x-auto">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.after && (
                      <div>
                        <div className="text-xs text-white/40 mb-1">После:</div>
                        <pre className="text-xs text-white/60 bg-black/30 rounded-xl p-3 overflow-x-auto">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
