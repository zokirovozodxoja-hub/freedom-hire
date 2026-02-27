import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function JobDetailsPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: job } = await supabase
    .from("jobs")
    .select("id,title,description,city,salary_from,salary_to,created_at,is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (!job) {
    return (
      <main className="min-h-screen bg-[#0b1220] text-white p-6">
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold">Вакансия не найдена</h1>
          <Link className="inline-block mt-4 underline" href="/jobs">
            ← Назад к вакансиям
          </Link>
        </div>
      </main>
    );
  }

  const salary =
    job.salary_from || job.salary_to ? `${job.salary_from ?? "—"} — ${job.salary_to ?? "—"}` : "не указана";

  return (
    <main className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{job.title ?? `Вакансия #${job.id.slice(0, 6)}`}</h1>
            <div className="text-white/70 mt-2">
              {job.city ?? "Узбекистан"} · Зарплата: {salary}
              {!job.is_active ? <span className="ml-2 text-white/50">(не активна)</span> : null}
            </div>
          </div>

          <Link
            href="/auth?role=candidate"
            className="rounded-2xl bg-white text-black px-5 py-2 font-semibold"
          >
            Откликнуться
          </Link>
        </div>

        {job.description ? (
          <div className="mt-6 whitespace-pre-wrap text-white/80 leading-relaxed">
            {job.description}
          </div>
        ) : (
          <div className="mt-6 text-white/60">Описание не указано</div>
        )}

        <div className="mt-8">
          <Link className="underline" href="/jobs">
            ← Назад к списку вакансий
          </Link>
        </div>
      </div>
    </main>
  );
}