"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string | null;
  city: string | null;
  website: string | null;
  created_at: string;
  is_verified: boolean;
  _jobCount?: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU");
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("companies")
      .select("id,name,city,website,created_at,is_verified")
      .order("created_at", { ascending: false });

    const list = (data ?? []) as Company[];

    // Считаем вакансии на каждую компанию
    const withCounts = await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("company_id", c.id);
        return { ...c, _jobCount: count ?? 0 };
      })
    );

    setCompanies(withCounts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleVerified(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("companies").update({ is_verified: !current }).eq("id", id);
    setCompanies((prev) =>
      prev.map((c) => c.id === id ? { ...c, is_verified: !current } : c)
    );
  }

  async function deleteCompany(id: string) {
    if (!confirm("Удалить компанию и все её вакансии?")) return;
    const supabase = createClient();
    await supabase.from("jobs").delete().eq("company_id", id);
    await supabase.from("companies").delete().eq("id", id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Компании</h1>

      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : companies.length === 0 ? (
        <p className="text-white/50">Нет компаний</p>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name ?? "Без названия"}</div>
                <div className="text-sm text-white/50 mt-0.5">
                  {c.city ?? "—"} · {formatDate(c.created_at)} · {c._jobCount} вак.
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-violet-400 hover:underline"
                    >
                      сайт ↗
                    </a>
                  )}
                </div>
              </div>

              <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                c.is_verified ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {c.is_verified ? "Верифицирована" : "Не верифицирована"}
              </span>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleVerified(c.id, c.is_verified)}
                  className="px-3 py-1.5 rounded-xl bg-white/8 text-sm hover:bg-white/15 transition-colors"
                >
                  {c.is_verified ? "Снять верификацию" : "Верифицировать"}
                </button>
                <button
                  onClick={() => deleteCompany(c.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
