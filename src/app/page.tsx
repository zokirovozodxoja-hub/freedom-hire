"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Stats = {
  active_jobs: number;
  companies: number;
  candidates: number;
  employers: number;
};

type LatestJob = {
  id: string;
  title: string | null;
  city: string | null;
  work_format: string | null;
  salary_from: number | null;
  salary_to: number | null;
  company_name: string | null;
  created_at: string;
};

function formatMoneyRange(from?: number | null, to?: number | null) {
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  if (to) return `до ${fmt(to)}`;
  return "ЗП не указана";
}

function formatWorkFormat(v?: string | null) {
  if (!v) return "";
  if (v === "office") return "Офис";
  if (v === "remote") return "Удалёнка";
  if (v === "hybrid") return "Гибрид";
  return v;
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    active_jobs: 0,
    companies: 0,
    candidates: 0,
    employers: 0,
  });
  const [jobs, setJobs] = useState<LatestJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      // 1) статистика
      const s = await supabase.rpc("fh_public_stats");
      if (s.error) {
        setError(s.error.message);
      } else {
        const val = (s.data ?? {}) as any;
        setStats({
          active_jobs: Number(val.active_jobs ?? 0),
          companies: Number(val.companies ?? 0),
          candidates: Number(val.candidates ?? 0),
          employers: Number(val.employers ?? 0),
        });
      }

      // 2) свежие вакансии
      const j = await supabase.rpc("fh_latest_jobs", { limit_count: 3 });
      if (j.error) {
        setError((prev) => prev ?? j.error.message);
        setJobs([]);
      } else {
        setJobs((j.data ?? []) as LatestJob[]);
      }

      setLoading(false);
    })();
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Активных вакансий", value: stats.active_jobs },
      { label: "Компаний", value: stats.companies },
      { label: "Соискателей", value: stats.candidates },
      { label: "Работодателей", value: stats.employers },
    ],
    [stats]
  );

  return (
    <div className="min-h-screen bg-[#070914] text-white">
      {/* TOP BAR */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-semibold">
              FH
            </div>
            <div>
              <div className="font-semibold leading-5">FreedomHIRE</div>
              <div className="text-xs text-white/50 leading-4">freedomhire.uz</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-white/70 text-sm">
            <button onClick={() => router.push("/jobs")} className="hover:text-white">
              Вакансии
            </button>
            <button onClick={() => router.push("/auth?role=employer")} className="hover:text-white">
              Работодателям
            </button>
            <button onClick={() => router.push("/about")} className="hover:text-white">
              О нас
            </button>
          </div>

          <button
            onClick={() => router.push("/auth")}
            className="rounded-2xl bg-[#6d39ff] px-5 py-2 font-semibold hover:opacity-95"
          >
            Войти / Регистрация
          </button>
        </div>
      </div>

      {/* HERO CARD */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* LEFT */}
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                Найди работу <span className="text-white/55 italic">своей мечты</span> в Узбекистане
              </h1>
              <p className="text-white/55 mt-4 max-w-xl">
                Тысячи вакансий от лучших компаний. Профессионально. Быстро. Надёжно.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => router.push("/jobs")}
                  className="rounded-2xl bg-[#6d39ff] px-6 py-3 font-semibold hover:opacity-95"
                >
                  Найти работу
                </button>
                <button
                  onClick={() => router.push("/auth?role=employer")}
                  className="rounded-2xl bg-white/10 border border-white/10 px-6 py-3 font-semibold hover:bg-white/15"
                >
                  Разместить вакансию
                </button>
              </div>

              {error ? (
                <div className="text-sm text-red-300 mt-4">
                  Ошибка данных: {error}
                </div>
              ) : null}
            </div>

            {/* RIGHT: latest jobs */}
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-white/70 text-sm mb-3">Свежие вакансии</div>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
                  <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-white/60 text-sm">
                  Пока нет активных вакансий. Создай вакансию как работодатель — она появится здесь.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => router.push("/jobs")}
                      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.09] p-4"
                      title="Открыть список вакансий"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{j.title ?? "Вакансия"}</div>
                          <div className="text-xs text-white/60 mt-1">
                            {(j.city ?? "Город не указан") +
                              (j.company_name ? ` · ${j.company_name}` : "")}
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            {formatWorkFormat(j.work_format)}
                            {j.work_format ? " · " : ""}
                            {formatMoneyRange(j.salary_from, j.salary_to)}
                          </div>
                        </div>
                        <div className="text-xs text-white/60">Новая</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {statCards.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-semibold">
                    {loading ? "…" : `${s.value.toLocaleString("ru-RU")}+`}
                  </div>
                  <div className="text-xs text-white/55 mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}