import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Job = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  city: string | null;
  salary_from: number | null;
  salary_to: number | null;
};

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, { auth: { persistSession: false } });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatSalary(from: number | null, to: number | null) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return "Зарплата не указана";
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

async function getCounts() {
  const supabase = supabaseServer();
  if (!supabase) {
    return { jobs: 0, companies: 0, candidates: 0, employers: 0 };
  }

  const jobsReq = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const companiesReq = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });

  const candByRole = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "candidate");

  const empByRole = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "employer");

  let candidates = candByRole.error ? 0 : (candByRole.count ?? 0);
  let employers = empByRole.error ? 0 : (empByRole.count ?? 0);

  if (candByRole.error) {
    const profilesReq = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    candidates = profilesReq.error ? 0 : (profilesReq.count ?? 0);
  }

  if (empByRole.error) {
    employers = companiesReq.error ? 0 : (companiesReq.count ?? 0);
  }

  return {
    jobs: jobsReq.error ? 0 : (jobsReq.count ?? 0),
    companies: companiesReq.error ? 0 : (companiesReq.count ?? 0),
    candidates,
    employers,
  };
}

async function getFreshJobs() {
  const supabase = supabaseServer();
  if (!supabase) return [];

  const { data } = await supabase
    .from("jobs")
    .select("id,title,description,created_at,city,salary_from,salary_to")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (data ?? []) as Job[];
}

export default async function HomePage() {
  const [counts, freshJobs] = await Promise.all([getCounts(), getFreshJobs()]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070A12] via-[#070A12] to-[#04060C]">
      {/* мягкие подсветки фона */}
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(900px 420px at 50% -10%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(700px 380px at 15% 15%, rgba(99,102,241,0.14), transparent 55%), radial-gradient(700px 380px at 85% 35%, rgba(16,185,129,0.08), transparent 55%)",
        }}
      />

      <div className="relative">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="p-7 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                FreedomHIRE • вакансии и кандидаты
              </div>

              <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-white max-w-3xl">
                Найди работу своей мечты в Узбекистане
              </h1>

              <p className="mt-4 text-sm sm:text-lg text-white/70 max-w-2xl leading-relaxed">
                Вакансии от реальных работодателей. Быстрый отклик и удобный путь
                для кандидатов и компаний.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/jobs"
                  className="h-11 px-5 inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition"
                >
                  Найти работу
                </Link>

                <Link
                  href="/employers"
                  className="h-11 px-5 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 transition"
                >
                  Работодателям
                </Link>
              </div>
            </div>

            {/* декоративная линия */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="px-7 sm:px-10 py-5 text-white/60 text-xs sm:text-sm">
              Подборка свежих вакансий обновляется автоматически
            </div>
          </section>

          {/* FRESH JOBS */}
          <section className="mt-8 sm:mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  Свежие вакансии
                </h2>
                <p className="mt-1 text-white/60 text-sm">
                  Последние активные вакансии на платформе
                </p>
              </div>

              <Link
                href="/jobs"
                className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition"
              >
                Все вакансии →
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {freshJobs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                  Пока нет активных вакансий.
                </div>
              ) : (
                freshJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/7 hover:border-white/15 transition shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold text-base sm:text-lg group-hover:text-white transition">
                          {job.title ?? "Без названия"}
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          {job.city ?? "Узбекистан"} • {formatDate(job.created_at)} •{" "}
                          {formatSalary(job.salary_from, job.salary_to)}
                        </p>
                      </div>

                      <span className="mt-1 shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
                        Открыть
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="mt-4 sm:hidden">
              <Link
                href="/jobs"
                className="inline-flex w-full items-center justify-center h-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition"
              >
                Все вакансии →
              </Link>
            </div>
          </section>

          {/* STATS */}
          <section className="mt-8 sm:mt-10">
            <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <Stat title="Активных вакансий" value={counts.jobs} />
              <Stat title="Компаний" value={counts.companies} />
              <Stat title="Соискателей" value={counts.candidates} />
              <Stat title="Работодателей" value={counts.employers} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <p className="text-2xl sm:text-3xl font-semibold text-white">
        {value.toLocaleString("ru-RU")}
      </p>
      <p className="mt-1 text-xs sm:text-sm text-white/60">{title}</p>
    </div>
  );
}