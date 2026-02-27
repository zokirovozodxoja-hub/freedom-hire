import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ApplyButton from "./ApplyButton";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  description: string | null;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
  is_active: boolean;
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

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseServer();
  if (!supabase) notFound();

  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,city,description,created_at,salary_from,salary_to,is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || !data.is_active) notFound();

  const job = data as Job;

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">{job.title ?? "Без названия"}</h1>
        <p className="mt-2 text-sm text-white/70">
          {job.city ?? "Узбекистан"} • {formatDate(job.created_at)} • {formatSalary(job.salary_from, job.salary_to)}
        </p>

        <div className="mt-6 whitespace-pre-wrap text-white/80">
          {job.description || "Описание пока не заполнено работодателем."}
        </div>

        <ApplyButton jobId={job.id} />
      </div>
    </div>
  );
}
