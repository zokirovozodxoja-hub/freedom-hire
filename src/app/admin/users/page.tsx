"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
 id: string;
 full_name: string | null;
 email: string | null;
 role: string | null;
 is_onboarded: boolean | null;
 is_blocked: boolean | null;
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
 const [error, setError] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const [confirmId, setConfirmId] = useState<string | null>(null);

 async function load() {
 setLoading(true);
 setError(null);
 const supabase = createClient();
 const { data, error: err } = await supabase
 .from("profiles")
 .select("id, full_name, email, role, is_onboarded, is_blocked, created_at")
 .order("created_at", { ascending: false });
 if (err) { setError(err.message); setLoading(false); return; }
 setUsers((data ?? []) as Profile[]);
 setLoading(false);
 }

 useEffect(() => { load(); }, []);

 async function toggleBlocked(id: string, current: boolean | null) {
 const supabase = createClient();
 const next = !current;
 const { error: err } = await supabase.from("profiles").update({ is_blocked: next }).eq("id", id);
 if (err) { setError(err.message); return; }
 setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_blocked: next } : u));
 }

 async function deleteUser(id: string) {
 setDeletingId(id);
 setError(null);
 const supabase = createClient();

 // Получаем токен для авторизации
 const { data: sessionData } = await supabase.auth.getSession();
 const token = sessionData.session?.access_token;

 if (!token) {
 setError("Не авторизован");
 setDeletingId(null);
 return;
 }

 // Вызываем API для полного удаления
 const res = await fetch("/api/admin/users", {
 method: "DELETE",
 headers: {
 "Content-Type": "application/json",
 "Authorization": `Bearer ${token}`,
 },
 body: JSON.stringify({ userId: id }),
 });

 const data = await res.json();

 if (!res.ok) {
 setError("Ошибка удаления: " + (data.error || "Неизвестная ошибка"));
 setDeletingId(null);
 return;
 }

 setUsers((prev) => prev.filter((u) => u.id !== id));
 setConfirmId(null);
 setDeletingId(null);
 }

 const filtered = users.filter((u) => {
 if (filter === "candidate" && u.role !== "candidate") return false;
 if (filter === "employer" && u.role !== "employer") return false;
 if (search) {
 const q = search.toLowerCase();
 return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
 }
 return true;
 });

 const counts = {
 all: users.length,
 candidate: users.filter((u) => u.role === "candidate").length,
 employer: users.filter((u) => u.role === "employer").length,
 };

 return (
 <div>
 <div className="flex flex-wrap items-center gap-3 mb-6">
 <h1 className="text-2xl font-black">Пользователи</h1>
 <div className="flex gap-2 ml-auto flex-wrap">
 {(["all", "candidate", "employer"] as const).map((f) => (
 <button key={f} onClick={() => setFilter(f)}
 className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
 filter === f ? "btn-primary text-white" : "bg-white/8 text-white/70 hover:text-white"
 }`}>
 {f === "all" ? `Все (${counts.all})` : f === "candidate" ? `Соискатели (${counts.candidate})` : `Работодатели (${counts.employer})`}
 </button>
 ))}
 </div>
 </div>

 <input
 type="text"
 placeholder="Поиск по имени, email или ID..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full mb-5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:border-violet-500"
 />

 {error && (
 <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
 )}

 {loading ? (
 <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="brand-card rounded-xl animate-pulse" style={{height:64}} />)}
        </div>
 ) : filtered.length === 0 ? (
 <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
 {users.length === 0 ? "Нет пользователей" : "Не найдено"}
 </div>
 ) : (
 <div className="space-y-3">
 {filtered.map((u) => (
 <div key={u.id}
 className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
 u.is_blocked ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"
 }`}>

 {/* Avatar */}
 <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
 style={{ background: u.role === "employer" ? "rgba(59,130,246,0.3)" : "rgba(124,58,237,0.3)" }}>
 {((u.full_name ?? u.email ?? "?")[0] ?? "?").toUpperCase()}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="font-semibold truncate flex items-center gap-2">
 <span>{u.full_name ?? "Без имени"}</span>
 {u.is_blocked && <span className="text-xs text-red-400 font-normal"> заблокирован</span>}
 </div>
 <div className="text-sm text-white/50 mt-0.5 truncate">
 {u.email ?? "нет email"} · {u.role ?? "—"} · {formatDate(u.created_at)}
 {u.is_onboarded === false && <span className="ml-1 text-yellow-400"> онбординг не пройден</span>}
 </div>
 </div>

 {/* Buttons */}
 <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${
 u.role === "employer" ? "bg-blue-500/20 text-blue-400" :
 u.role === "candidate" ? "bg-emerald-500/20 text-emerald-400" :
 "bg-white/10 text-white/40"
 }`}>
 {u.role === "employer" ? "Работодатель" : u.role === "candidate" ? "Соискатель" : u.role ?? "—"}
 </span>

 <Link href={`/admin/users/${u.id}`}
 className="px-3 py-1.5 rounded-xl text-sm transition bg-white/8 text-white/70 hover:bg-white/15 hover:text-white">
 Профиль
 </Link>

 <button onClick={() => toggleBlocked(u.id, u.is_blocked)}
 className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
 u.is_blocked
 ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
 : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
 }`}>
 {u.is_blocked ? "Разблокировать" : "Заблокировать"}
 </button>

 {confirmId === u.id ? (
 <div className="flex items-center gap-1">
 <button
 onClick={() => deleteUser(u.id)}
 disabled={deletingId === u.id}
 className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
 style={{ background: "rgba(239,68,68,0.25)", color: "#f87171" }}>
 {deletingId === u.id ? "..." : "Подтвердить"}
 </button>
 <button onClick={() => setConfirmId(null)}
 className="px-3 py-1.5 rounded-xl text-xs transition"
 style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
 Отмена
 </button>
 </div>
 ) : (
 <button onClick={() => setConfirmId(u.id)}
 className="px-3 py-1.5 rounded-xl text-sm transition"
 style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
 Удалить
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
