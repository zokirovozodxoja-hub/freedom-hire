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
    const profilesReq = await supabase.from("profiles").select("id", { count: "exact", head: true });
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
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-black">Найди работу своей мечты в Узбекистане</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Вакансии от реальных работодателей. Быстрый отклик и удобный путь для кандидатов и компаний.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/jobs" className="rounded-2xl bg-[#7c3aed] px-5 py-3 font-semibold">Найти работу</Link>
          <Link href="/employers" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3">Работодателям</Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold">Свежие вакансии</h2>
        <div className="mt-4 grid gap-3">
          {freshJobs.length === 0 ? (
            <p className="text-white/70">Пока нет активных вакансий.</p>
          ) : (
            freshJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-black/30">
                <p className="font-semibold">{job.title ?? "Без названия"}</p>
                <p className="mt-1 text-sm text-white/70">
                  {job.city ?? "Узбекистан"} • {formatDate(job.created_at)} • {formatSalary(job.salary_from, job.salary_to)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Активных вакансий" value={counts.jobs} />
        <Stat title="Компаний" value={counts.companies} />
        <Stat title="Соискателей" value={counts.candidates} />
        <Stat title="Работодателей" value={counts.employers} />
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-2xl font-black">{value.toLocaleString("ru-RU")}</p>
      <p className="mt-1 text-sm text-white/70">{title}</p>
    </div>
  );
}
