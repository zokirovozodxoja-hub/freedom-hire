import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

type Job = {
  id: string
  title: string
  description: string | null
  created_at: string
  company_id: string | null
}

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

async function getCounts() {
  const supabase = supabaseServer()

  const jobsCountReq = await supabase.from("jobs").select("*", { count: "exact", head: true })
  const companiesCountReq = await supabase.from("companies").select("*", { count: "exact", head: true })

  let candidatesCount = 0
  let employersCount = 0

  // Пытаемся посчитать по role (если у вас есть колонка role в profiles)
  const candByRole = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "candidate")

  const empByRole = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employer")

  if (!candByRole.error) candidatesCount = candByRole.count || 0
  if (!empByRole.error) employersCount = empByRole.count || 0

  // Если role нет (ошибка) — просто показываем общее число профилей как соискатели, а работодатели = компании
  if (candByRole.error) {
    const totalProfiles = await supabase.from("profiles").select("*", { count: "exact", head: true })
    candidatesCount = totalProfiles.count || 0
  }
  if (empByRole.error) {
    employersCount = companiesCountReq.count || 0
  }

  return {
    jobs: jobsCountReq.count || 0,
    companies: companiesCountReq.count || 0,
    candidates: candidatesCount,
    employers: employersCount,
    hasEnvError: false,
  }
}

async function getFreshJobs() {
  const supabase = supabaseServer()

  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,description,created_at,company_id")
    .order("created_at", { ascending: false })
    .limit(3)

  if (error) return []
  return (data || []) as Job[]
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("ru-RU")
  } catch {
    return ""
  }
}

export default async function HomePage() {
  let counts = { jobs: 0, companies: 0, candidates: 0, employers: 0, hasEnvError: false }
  let freshJobs: Job[] = []

  try {
    counts = await getCounts()
    freshJobs = await getFreshJobs()
  } catch (e) {
    // Если env переменные не подхватились на Vercel — покажем понятный текст
    return (
      <main style={{ minHeight: "100vh", background: "#0b0a14", color: "#fff", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>FreedomHIRE</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.5, maxWidth: 780 }}>
          Ошибка подключения к Supabase. Проверь, что на Vercel в Project Settings → Environment Variables
          добавлены:
          <br />
          NEXT_PUBLIC_SUPABASE_URL
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY
          <br />
          Потом сделай Redeploy.
        </p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0a14", color: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 64px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "12px 0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          </div>

          <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link href="/jobs" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>
              Вакансии
            </Link>
            <Link href="/employers" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>
              Работодателям
            </Link>
            <Link href="/about" style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>
              О нас
            </Link>
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
                Найди работу <span style={{ opacity: 0.7, fontStyle: "italic" }}>своей мечты</span> в
                Узбекистане
              </h1>

              <p style={{ marginTop: 10, opacity: 0.78, fontSize: 16, lineHeight: 1.6, maxWidth: 520 }}>
                Вакансии от реальных работодателей. Профессионально. Быстро. Надёжно.
              </p>

              <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                <Link
                  href="/jobs"
                  style={{
                    textDecoration: "none",
                    color: "white",
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: "rgba(124,58,237,0.95)",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  Найти работу
                </Link>

                <Link
                  href="/employer"
                  style={{
                    textDecoration: "none",
                    color: "white",
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.06)",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  Разместить вакансию
                </Link>
              </div>
            </div>

            <div
              style={{
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                padding: 18,
              }}
            >
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
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{job.title}</div>
                      <div style={{ opacity: 0.72, fontSize: 13, display: "flex", gap: 10 }}>
                        <span>Узбекистан</span>
                        <span>•</span>
                        <span>{formatDate(job.created_at)}</span>
                      </div>
                      {job.description ? (
                        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13, lineHeight: 1.4 }}>
                          {job.description.slice(0, 90)}
                          {job.description.length > 90 ? "..." : ""}
                        </div>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 26,
              paddingTop: 18,
              borderTop: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <Stat title="Активных вакансий" value={counts.jobs} />
            <Stat title="Компаний" value={counts.companies} />
            <Stat title="Соискателей" value={counts.candidates} />
            <Stat title="Работодателей" value={counts.employers} />
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 14,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value.toLocaleString("ru-RU")}+</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{title}</div>
    </div>
  )
}
