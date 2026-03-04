"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DocMeta = { path: string; name: string; size?: number; type?: string };

type Company = {
 id: string;
 name: string | null;
 city: string | null;
 inn: string | null;
 website: string | null;
 created_at: string;
 verification_status: string | null;
 is_verified: boolean;
 doc_urls: DocMeta[] | null;
 _jobCount?: number;
};

function formatDate(iso: string) {
 return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes?: number) {
 if (!bytes) return "";
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
 return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
 approved: { label: "Верифицирована", bg: "rgba(52,211,153,0.15)", text: "#6ee7b7" },
 pending: { label: "На проверке", bg: "rgba(201,168,76,0.15)", text: "#C9A84C" },
 rejected: { label: "Отклонена", bg: "rgba(239,68,68,0.15)", text: "#f87171" },
 unknown: { label: "Не верифицирована", bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" },
};

export default function AdminCompaniesPage() {
 const [companies, setCompanies] = useState<Company[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<string>("");
 const [docLoading, setDocLoading] = useState<string | null>(null);

 async function load() {
 const supabase = createClient();
 const { data } = await supabase
 .from("companies")
 .select("id,name,city,inn,website,created_at,verification_status,is_verified,doc_urls")
 .order("created_at", { ascending: false });

 const list = (data ?? []) as Company[];

 const withCounts = await Promise.all(
 list.map(async (c) => {
 const { count } = await supabase
 .from("jobs")
 .select("id", { count: "exact", head: true })
 .eq("company_id", c.id);
 return { ...c, _jobCount: count ?? 0 };
 })
 );

 setCompanies(withCounts);
 setLoading(false);
 }

 useEffect(() => { load(); }, []);

 async function openDoc(path: string) {
 setDocLoading(path);
 const supabase = createClient();
 const { data, error } = await supabase.storage
 .from("company-docs")
 .createSignedUrl(path, 60 * 5); // 5 минут

 setDocLoading(null);

 if (error || !data?.signedUrl) {
 alert("Не удалось открыть документ: " + (error?.message ?? "неизвестная ошибка"));
 return;
 }
 window.open(data.signedUrl, "_blank");
 }

 async function setVerification(id: string, status: "approved" | "rejected") {
 const supabase = createClient();
 await supabase.from("companies").update({
 verification_status: status,
 is_verified: status === "approved",
 }).eq("id", id);
 setCompanies((prev) =>
 prev.map((c) => c.id === id ? { ...c, verification_status: status, is_verified: status === "approved" } : c)
 );
 }

 async function deleteCompany(id: string) {
 
 const supabase = createClient();
 await supabase.from("jobs").delete().eq("company_id", id);
 await supabase.from("companies").delete().eq("id", id);
 setCompanies((prev) => prev.filter((c) => c.id !== id));
 }

 const filtered = filter ? companies.filter((c) => (c.verification_status ?? "unknown") === filter) : companies;
 const pendingCount = companies.filter((c) => c.verification_status === "pending").length;

 return (
 <div>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-black">Компании</h1>
 {pendingCount > 0 && (
 <div className="mt-1 text-sm" style={{ color: "#C9A84C" }}>
 {pendingCount} ожидают проверки
 </div>
 )}
 </div>
 </div>

 {/* Фильтр */}
 <div className="flex flex-wrap gap-2 mb-5">
 {[
 { value: "", label: `Все (${companies.length})` },
 { value: "pending", label: `На проверке (${companies.filter(c => c.verification_status === "pending").length})` },
 { value: "approved", label: `Верифицированы (${companies.filter(c => c.verification_status === "approved").length})` },
 { value: "rejected", label: `Отклонены (${companies.filter(c => c.verification_status === "rejected").length})` },
 ].map((f) => (
 <button key={f.value} onClick={() => setFilter(f.value)}
 className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
 filter === f.value ? "btn-primary text-white" : "bg-white/8 text-white/70 hover:text-white"
 }`}>
 {f.label}
 </button>
 ))}
 </div>

 {loading ? (
 <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="brand-card rounded-xl animate-pulse" style={{height:64}} />)}
        </div>
 ) : filtered.length === 0 ? (
 <p className="text-white/50">Нет компаний</p>
 ) : (
 <div className="space-y-4">
 {filtered.map((c) => {
 const st = STATUS_CONFIG[c.verification_status ?? "unknown"] ?? STATUS_CONFIG.unknown;
 const docs = c.doc_urls ?? [];
 return (
 <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 min-w-0">
 {/* Название + статус */}
 <div className="flex items-center gap-3 flex-wrap mb-2">
 <div className="font-semibold text-white text-lg">{c.name ?? "Без названия"}</div>
 <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
 style={{ background: st.bg, color: st.text }}>
 {st.label}
 </span>
 </div>

 {/* Мета */}
 <div className="flex flex-wrap gap-3 text-sm text-white/50 mb-3">
 {c.city && <span> {c.city}</span>}
 {c.inn && <span>ИНН: {c.inn}</span>}
 <span> {formatDate(c.created_at)}</span>
 <span> {c._jobCount} вакансий</span>
 {c.website && (
 <a href={c.website} target="_blank" rel="noopener noreferrer"
 className="text-violet-400 hover:underline">
 сайт ↗
 </a>
 )}
 </div>

 {/* Документы */}
 {docs.length > 0 ? (
 <div>
 <div className="text-xs text-white/30 mb-2 uppercase tracking-wider">
 Документы ({docs.length})
 </div>
 <div className="flex flex-wrap gap-2">
 {docs.map((doc, i) => (
 <button
 key={i}
 onClick={() => openDoc(doc.path)}
 disabled={docLoading === doc.path}
 className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition hover:bg-white/10 disabled:opacity-50"
 style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
 >
 {docLoading === doc.path ? (
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <span></span>
 )}
 <span className="max-w-[140px] truncate">{doc.name}</span>
 {doc.size && (
 <span className="text-xs text-white/30">{formatSize(doc.size)}</span>
 )}
 <span className="text-xs text-violet-400">↗</span>
 </button>
 ))}
 </div>
 </div>
 ) : (
 <div className="text-sm text-white/30 italic">Документы не прикреплены</div>
 )}
 </div>

 {/* Кнопки действий */}
 <div className="flex flex-col gap-2 shrink-0">
 {c.verification_status === "pending" && (
 <>
 <button onClick={() => setVerification(c.id, "approved")}
 className="px-4 py-2 rounded-xl text-sm font-medium transition"
 style={{ background: "rgba(52,211,153,0.2)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
 Одобрить
 </button>
 <button onClick={() => setVerification(c.id, "rejected")}
 className="px-4 py-2 rounded-xl text-sm font-medium transition"
 style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
 Отклонить
 </button>
 </>
 )}
 {c.verification_status === "approved" && (
 <button onClick={() => setVerification(c.id, "rejected")}
 className="px-3 py-1.5 rounded-xl text-xs transition bg-white/8 text-white/60 hover:bg-white/12">
 Отозвать
 </button>
 )}
 {(c.verification_status === "rejected" || !c.verification_status) && (
 <button onClick={() => setVerification(c.id, "approved")}
 className="px-3 py-1.5 rounded-xl text-xs transition bg-white/8 text-white/60 hover:bg-white/12">
 Одобрить
 </button>
 )}
 <button onClick={() => deleteCompany(c.id)}
 className="px-3 py-1.5 rounded-xl text-xs transition"
 style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
 Удалить
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
