"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

function preview(text: string | null) {
  if (!text) return "Описание пока не заполнено.";
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,city,description,created_at,salary_from,salary_to,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) setMessage(error.message);
      setJobs((data ?? []) as Job[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вакансии</h1>
        <Link href="/" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2">На главную</Link>
      </div>

      {loading ? <p>Загрузка вакансий...</p> : null}
      {message ? <p className="mb-4 text-sm text-red-300">{message}</p> : null}

      <div className="space-y-4">
        {!loading && jobs.length === 0 ? <p className="text-white/70">Вакансий пока нет.</p> : null}
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
            <h2 className="text-lg font-semibold">{job.title ?? "Без названия"}</h2>
            <p className="mt-1 text-sm text-white/70">
              {job.city ?? "Узбекистан"} • {formatSalary(job.salary_from, job.salary_to)} • Опубликовано {formatDate(job.created_at)}
            </p>
            <p className="mt-2 text-sm text-white/70">{preview(job.description)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
