"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Company = { id: string; name: string | null };

function formatNumberWithSpaces(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function parseNumberSpaces(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return null;
  return Number(digitsOnly);
}

export default function NewJobPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");

  const [salaryFromText, setSalaryFromText] = useState("");
  const [salaryToText, setSalaryToText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const salaryFrom = useMemo(() => parseNumberSpaces(salaryFromText), [salaryFromText]);
  const salaryTo = useMemo(() => parseNumberSpaces(salaryToText), [salaryToText]);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      router.replace("/auth?role=employer");
      return;
    }

    // компании работодателя
    const { data: comps, error } = await supabase
      .from("companies")
      .select("id,name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setCompanies([]);
      setLoading(false);
      return;
    }

    const list = (comps ?? []) as Company[];
    setCompanies(list);
    setCompanyId(list[0]?.id ?? "");

    if (!list.length) {
      setMsg("Сначала создай компанию работодателя.");
    }

    setLoading(false);
  }

  async function onCreate() {
    setMsg(null);

    if (!companyId) {
      setMsg("Сначала создай компанию работодателя.");
      return;
    }

    if (salaryFrom && salaryTo && salaryFrom > salaryTo) {
      setMsg("Зарплата 'от' не может быть больше 'до'");
      return;
    }

    setSaving(true);

    // ВАЖНО: вставляем ТОЛЬКО существующие колонки из твоей jobs
    const { error } = await supabase.from("jobs").insert({
      company_id: companyId,
      salary_from: salaryFrom,
      salary_to: salaryTo,
      is_active: isActive,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.replace("/employer/jobs");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Новая вакансия</h1>
            <div className="text-white/60 mt-1">
              Сейчас вакансия создаётся по твоей текущей структуре таблицы <b>jobs</b> (salary_from/salary_to/is_active).
            </div>
            {msg ? <div className="text-white/70 text-sm mt-2">{msg}</div> : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/employer/jobs")}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2"
            >
              Назад
            </button>
            <button
              onClick={onCreate}
              disabled={saving || !companyId}
              className="rounded-2xl bg-white text-black px-5 py-2 font-semibold disabled:opacity-60"
            >
              {saving ? "Сохраняю..." : "Создать"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {/* company */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Компания</div>

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>

            {!companies.length ? (
              <button
                onClick={() => router.push("/onboarding/employer")}
                className="mt-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-2"
              >
                Создать компанию
              </button>
            ) : null}
          </div>

          {/* salary */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/70 mb-3">Зарплата</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60">Зарплата от</label>
                <input
                  inputMode="numeric"
                  placeholder="3 000 000"
                  value={salaryFromText}
                  onChange={(e) => setSalaryFromText(formatNumberWithSpaces(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Зарплата до</label>
                <input
                  inputMode="numeric"
                  placeholder="5 000 000"
                  value={salaryToText}
                  onChange={(e) => setSalaryToText(formatNumberWithSpaces(e.target.value))}
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="is_active" className="text-sm text-white/70">
                Сразу публиковать (is_active)
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
