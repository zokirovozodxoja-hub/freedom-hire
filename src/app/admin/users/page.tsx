"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_onboarded: boolean;
  is_blocked: boolean;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "candidate" | "employer">("all");
  const [search, setSearch] = useState("");

  async function load() {
    const supabase = createClient();
    let q = supabase
      .from("profiles")
      .select("id,full_name,email,role,is_onboarded,is_blocked,created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") q = q.eq("role", filter);

    const { data } = await q;
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleBlocked(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("profiles").update({ is_blocked: !current }).eq("id", id);
    setUsers((prev) =>
      prev.map((u) => u.id === id ? { ...u, is_blocked: !current } : u)
    );
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-black">Пользователи</h1>
        <div className="flex gap-2 ml-auto">
          {(["all", "candidate", "employer"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? "bg-[#7c3aed] text-white" : "bg-white/8 text-white/70 hover:text-white"
              }`}
            >
              {f === "all" ? "Все" : f === "candidate" ? "Соискатели" : "Работодатели"}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        placeholder="Поиск по имени или email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:border-violet-500"
      />

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/50">Нет пользователей</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition-colors ${
                u.is_blocked
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {/* Аватар-заглушка */}
              <div className="w-9 h-9 rounded-full bg-violet-600/30 flex items-center justify-center text-sm font-bold shrink-0">
                {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {u.full_name ?? "Без имени"}
                  {u.is_blocked && <span className="ml-2 text-xs text-red-400">заблокирован</span>}
                </div>
                <div className="text-sm text-white/50 mt-0.5">
                  {u.email ?? "—"} · {u.role ?? "—"} · {formatDate(u.created_at)}
                  {u.is_onboarded ? "" : " · ⚠️ не прошёл онбординг"}
                </div>
              </div>

              <button
                onClick={() => toggleBlocked(u.id, u.is_blocked)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors ${
                  u.is_blocked
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }`}
              >
                {u.is_blocked ? "Разблокировать" : "Заблокировать"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
