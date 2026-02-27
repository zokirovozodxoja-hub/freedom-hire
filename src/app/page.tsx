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

  if (!url || !key) throw new Error("Missing Supabase env vars");

  return createClient(url, key, { auth: { persistSession: false } });
}

async function getCounts() {
  const supabase = supabaseServer();

  const jobsReq = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const companiesReq = await supabase.from("companies").select("*", { count: "exact", head: true });

  // candidates/employers по role, если есть колонка role
  let candidates = 0;
  let employers = 0;

  const candByRole = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "candidate");

  const empByRole = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employer");

  if (!candByRole.error) candidates = candByRole.count || 0;
  if (!empByRole.error) employers = empByRole.count || 0;

  // fallback если role нет
  if (candByRole.error) {
    const totalProfiles = await supabase.from("profiles").select("*", { count: "exact", head: true });
    candidates = totalProfiles.count || 0;
  }
  if (empByRole.error) {
    employers = companiesReq.count || 0;
  }

  return {
    jobs: jobsReq.count || 0,
    companies: companiesReq.count || 0,
    candidates,
    employers,
  };
}

async function getFreshJobs() {
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("jobs")
    .select("id,title,description,created_at,city,salary_from,salary_to")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (data || []) as Job[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU");
  } catch {
    return "";
  }
}

function formatSalary(from: number | null, to: number | null) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (!from && !to) return "Зарплата не указана";
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

export default async function HomePage() {
  let counts = { jobs: 0, companies: 0, candidates: 0, employers: 0 };
  let freshJobs: Job[] = [];

  try {
    counts = await getCounts();
    freshJobs = await getFreshJobs();
  } catch {
    return (
      <main style={{ minHeight: "100vh", background: "#0b0a14", color: "#fff", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>FreedomHIRE</h1>
        <p style={{ opacity: 0.8, maxWidth: 720, lineHeight: 1.6 }}>
          Ошибка подключения к Supabase. Проверь переменные окружения на Vercel:
          <br />
          NEXT_PUBLIC_SUPABASE_URL
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0a14", color: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 64px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0 24px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "white" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <span style={{ fontWeight: 800 }}>FH</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>FreedomHIRE</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>freedomhire.uz</div>
            </div>
          </Link>

          <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link href="/jobs" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>Вакансии</Link>
            <Link href="/employer" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>Работодателям</Link>
            <Link href="/about" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>О нас</Link>
          </nav>

          <Link
            href="/auth"
            style={{
              textDecoration: "none",
              color: "white",
              padding: "10px 14px",
              borderRadius: 14,
              background: "linear-gradient(90deg, rgba(124,58,237,1) 0%, rgba(168,85,247,1) 100%)",
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.12)",
              whiteSpace: "nowrap",
            }}
          >
            Войти / Регистрация
          </Link>
        </header>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.10)",
            background:
              "radial-gradient(1200px 500px at 20% 10%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(900px 500px at 80% 30%, rgba(168,85,247,0.18), transparent 60%), rgba(255,255,255,0.03)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
            padding: 34,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            <div>
              <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: "10px 0 12px", fontWeight: 900 }}>
                Найди работу <span style={{ opacity: 0.7, fontStyle: "italic" }}>своей мечты</span> в Узбекистане
              </h1>

              <p style={{ marginTop: 10, opacity: 0.78, fontSize: 16, lineHeight: 1.6, maxWidth: 520 }}>
                Вакансии от реальных работодателей. Профессионально. Быстро. Надёжно.
              </p>

              <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                <Link href="/jobs" style={{ textDecoration: "none", color: "white", padding: "12px 18px", borderRadius: 14, background: "rgba(124,58,237,0.95)", fontWeight: 800, border: "1px solid rgba(255,255,255,0.12)" }}>
                  Найти работу
                </Link>

                <Link href="/employer" style={{ textDecoration: "none", color: "white", padding: "12px 18px", borderRadius: 14, background: "rgba(255,255,255,0.06)", fontWeight: 800, border: "1px solid rgba(255,255,255,0.12)" }}>
                  Разместить вакансию
                </Link>
              </div>
            </div>

            <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", padding: 18 }}>
              <div style={{ opacity: 0.8, fontWeight: 700, marginBottom: 12 }}>Свежие вакансии</div>

              <div style={{ display: "grid", gap: 12 }}>
                {freshJobs.length === 0 ? (
                  <div style={{ opacity: 0.75, lineHeight: 1.5 }}>
                    Пока нет вакансий. Добавь первую вакансию через работодателя, и она появится здесь.
                  </div>
                ) : (
                  freshJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      style={{
                        textDecoration: "none",
                        color: "white",
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.22)",
                        padding: 14,
                        display: "block",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{job.title || `Вакансия #${job.id.slice(0, 6)}`}</div>
                      <div style={{ opacity: 0.72, fontSize: 13, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>{job.city || "Узбекистан"}</span>
                        <span>•</span>
                        <span>{formatDate(job.created_at)}</span>
                        <span>•</span>
                        <span>{formatSalary(job.salary_from, job.salary_to)}</span>
                      </div>

                      {job.description ? (
                        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13, lineHeight: 1.4 }}>
                          {job.description.slice(0, 110)}
                          {job.description.length > 110 ? "..." : ""}
                        </div>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.10)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Stat title="Активных вакансий" value={counts.jobs} />
            <Stat title="Компаний" value={counts.companies} />
            <Stat title="Соискателей" value={counts.candidates} />
            <Stat title="Работодателей" value={counts.employers} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 14, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value.toLocaleString("ru-RU")}+</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{title}</div>
    </div>
  );
}