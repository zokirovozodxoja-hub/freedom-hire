"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string | null;
  city: string | null;
  description: string | null;
  created_at: string;
  salary_from: number | null;
  salary_to: number | null;
};

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

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,city,description,created_at,salary_from,salary_to")
        .eq("id", id)
        .maybeSingle();

      if (error) setMsg(error.message);
      setJob((data as Job) || null);
      setLoading(false);
    })();
  }, [id]);

  async function apply() {
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push(`/auth?role=candidate`);
      return;
    }

    const { data: existing, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", user.id)
      .eq("job_id", id)
      .maybeSingle();

    if (checkError) {
      setMsg(checkError.message);
      return;
    }

    if (existing?.id) {
      setMsg("Ты уже откликался ✅");
      return;
    }

    const { error } = await supabase.from("applications").insert({
      candidate_id: user.id,
      job_id: id,
      status: "applied",
      cover_letter: null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Отклик отправлен ✅ Работодатель увидит его в разделе заявок.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-white/70">Вакансия не найдена</div>
          <button
            onClick={() => router.push("/jobs")}
            className="mt-4 rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
          >
            Назад к вакансиям
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{job.title || `Вакансия #${job.id.slice(0, 6)}`}</h1>
            <div className="text-white/70 mt-2 flex flex-wrap gap-2">
              <span>{job.city || "Узбекистан"}</span>
              <span>•</span>
              <span>{formatSalary(job.salary_from, job.salary_to)}</span>
              <span>•</span>
              <span>{formatDate(job.created_at)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/jobs")}
              className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
            >
              Назад
            </button>
            <button
              onClick={apply}
              className="rounded-2xl bg-white text-black px-4 py-2 font-semibold"
            >
              Откликнуться
            </button>
          </div>
        </div>

        {msg ? <div className="mt-4 text-sm text-white/70">{msg}</div> : null}

        <div className="mt-6 whitespace-pre-wrap text-white/80 leading-relaxed">
          {job.description || "Описание пока не заполнено работодателем."}
        </div>
      </div>
    </div>
  );
}