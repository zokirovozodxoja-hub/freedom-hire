"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  description: string | null;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
  employment_type: string | null;
  format: string | null;
  experience: string | null;
};

const CITIES = [
  "Все города",
  "Ташкент",
  "Самарканд",
  "Бухара",
  "Наманган",
  "Андижан",
  "Фергана",
  "Нукус",
  "Карши",
  "Термез",
  "Коканд",
  "Ургенч",
  "Навои",
  "Джизак",
];
const FORMATS = [
  { value: "", label: "Любой формат" },
  { value: "office", label: "Офис" },
  { value: "remote", label: "Удалённо" },
  { value: "hybrid", label: "Гибрид" },
];
const EXPERIENCE_LEVELS = [
  { value: "", label: "Любой опыт" },
  { value: "no_experience", label: "Без опыта" },
  { value: "junior", label: "До 1 года" },
  { value: "middle", label: "1–3 года" },
  { value: "senior", label: "3–5 лет" },
  { value: "lead", label: "5+ лет" },
];

function formatSalary(from: number | null, to: number | null) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return null;
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [format, setFormat] = useState("");
  const [experience, setExperience] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("jobs")
      .select("id,title,city,description,created_at,salary_from,salary_to,employment_type,format,experience")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (city) q = q.ilike("city", `%${city}%`);
    if (format) q = q.eq("format", format);
    if (experience) q = q.eq("experience", experience);

    const { data } = await q;
    let list = (data ?? []) as Job[];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (j) => j.title?.toLowerCase().includes(s) || j.description?.toLowerCase().includes(s)
      );
    }

    setJobs(list);
    setLoading(false);
  }, [search, city, format, experience]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      <div className="border-b" style={{ borderColor: "rgba(196,173,255,0.08)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="font-accent text-xs mb-2" style={{ color: "var(--lavender)" }}>ВАКАНСИИ</div>
          <h1 className="font-display text-4xl sm:text-5xl" style={{ color: "var(--chalk)" }}>
            Все предложения
          </h1>
          <p className="font-body text-white/40 mt-2 text-sm">
            {loading ? "Загружаем..." : `${jobs.length} вакансий`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ═══ ФИЛЬТРЫ ═══ */}
          <aside className="lg:w-56 shrink-0 space-y-5">
            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>ПОИСК</div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Должность, навык..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl font-body text-sm text-white placeholder-white/25 focus:outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.12)" }}
                />
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>ГОРОД</div>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => {
                  const active = (c === "Все города" && !city) || city === c;
                  return (
                    <button key={c} onClick={() => setCity(c === "Все города" ? "" : c)}
                      className="px-3 py-1.5 rounded-xl text-xs font-body transition"
                      style={{
                        background: active ? "rgba(92,46,204,0.4)" : "rgba(255,255,255,0.05)",
                        border: active ? "1px solid rgba(196,173,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: active ? "var(--lavender)" : "rgba(255,255,255,0.5)",
                      }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>ФОРМАТ</div>
              <div className="space-y-1">
                {FORMATS.map((f) => (
                  <button key={f.value} onClick={() => setFormat(f.value)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-body transition"
                    style={{
                      background: format === f.value ? "rgba(92,46,204,0.3)" : "transparent",
                      color: format === f.value ? "var(--lavender)" : "rgba(255,255,255,0.45)",
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-accent text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>ОПЫТ</div>
              <div className="space-y-1">
                {EXPERIENCE_LEVELS.map((e) => (
                  <button key={e.value} onClick={() => setExperience(e.value)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-body transition"
                    style={{
                      background: experience === e.value ? "rgba(92,46,204,0.3)" : "transparent",
                      color: experience === e.value ? "var(--lavender)" : "rgba(255,255,255,0.45)",
                    }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {(search || city || format || experience) && (
              <button onClick={() => { setSearch(""); setCity(""); setFormat(""); setExperience(""); }}
                className="w-full py-2 rounded-xl text-xs font-accent transition"
                style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                СБРОСИТЬ ФИЛЬТРЫ
              </button>
            )}
          </aside>

          {/* ═══ СПИСОК ═══ */}
          <div className="flex-1">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="brand-card rounded-2xl h-24 animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="brand-card rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-body text-white/40">Ничего не найдено</div>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const salary = formatSalary(job.salary_from, job.salary_to);
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`}
                      className="brand-card rounded-2xl p-5 flex gap-4 items-start group transition-all hover:border-[rgba(196,173,255,0.25)] block">
                      <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-accent text-sm"
                        style={{ background: "rgba(92,46,204,0.2)", color: "var(--lavender)", border: "1px solid rgba(92,46,204,0.3)" }}>
                        {(job.title ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-body font-semibold text-white group-hover:text-[var(--lavender)] transition line-clamp-1">
                            {job.title ?? "Без названия"}
                          </h2>
                          <div className="flex items-center gap-2 shrink-0">
                            {isNew(job.created_at) && (
                              <span className="badge-new text-xs px-2 py-0.5 rounded-full font-accent">NEW</span>
                            )}
                            <span className="text-xs text-white/30 font-body">{daysSince(job.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {job.city && (
                            <span className="text-xs text-white/40 font-body">{job.city}</span>
                          )}
                          {job.format && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-body"
                              style={{ background: "rgba(196,173,255,0.08)", color: "var(--lavender)" }}>
                              {job.format === "remote" ? "Удалённо" : job.format === "hybrid" ? "Гибрид" : "Офис"}
                            </span>
                          )}
                          {salary && (
                            <span className="text-xs font-semibold font-body" style={{ color: "var(--gold)" }}>
                              {salary} сум
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
