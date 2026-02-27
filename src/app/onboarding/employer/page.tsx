"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace("/auth?role=employer");
        return;
      }

      // если компания уже есть — сразу в кабинет
      const { data: existing } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existing) {
        router.replace("/employer");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  async function createCompany() {
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      router.replace("/auth?role=employer");
      return;
    }

    if (!name.trim()) {
      setMsg("Введите название компании");
      return;
    }

    const { error } = await supabase.from("companies").insert({
      owner_id: user.id,
      name: name.trim(),
      city: city.trim() || null,
      description: description.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace("/employer");
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
      <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Онбординг работодателя</h1>
        <p className="text-white/70 mt-2">Создайте компанию — затем сможете разместить вакансию.</p>

        {msg ? <div className="text-white/70 mt-3">{msg}</div> : null}

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-xs text-white/60">Название компании *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="Напр. Comnet"
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Город</div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="Ташкент"
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Описание</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full h-[120px] rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              placeholder="Коротко о компании..."
            />
          </div>

          <button
            onClick={createCompany}
            className="w-full rounded-2xl bg-white text-black px-5 py-3 font-semibold"
          >
            Создать компанию
          </button>
        </div>
      </div>
    </div>
  );
}
