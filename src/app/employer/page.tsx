"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  city: string | null;
};

export default function EmployerDashboard() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        router.replace("/auth?role=employer");
        return;
      }

      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!data) {
        router.replace("/onboarding/employer");
        return;
      }

      setCompany(data);
    })();
  }, [router]);

  if (!company) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <div className="text-white/70 mt-2">
          {company.city ? company.city : "Город не указан"}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/employer/jobs")}
            className="bg-white text-black px-5 py-2 rounded-2xl font-semibold"
          >
            Мои вакансии
          </button>

          <button
            onClick={() => router.push("/employer/applications")}
            className="bg-white/10 border border-white/10 px-5 py-2 rounded-2xl"
          >
            Отклики
          </button>
        </div>
      </div>
    </div>
  );
}
