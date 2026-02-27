"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/profile";

function CandidateOnboardingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const isEditMode = sp.get("edit") === "1";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    (async () => {
      const { profile, user, error } = await getMyProfile();

      if (!user) {
        router.push("/auth?role=candidate");
        return;
      }

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      // Если профиль уже заполнен и НЕ режим редактирования — отправляем в кабинет
      if (profile?.is_onboarded && !isEditMode) {
        router.push("/resume");
        return;
      }

      // Подставляем текущие данные, чтобы не затирать
      setFullName(profile?.full_name ?? "");
      setHeadline(profile?.headline ?? "");
      setCity(profile?.city ?? "");
      setAbout(profile?.about ?? "");

      setLoading(false);
    })();
  }, [router, isEditMode]);

  async function onSave() {
    setSaving(true);
    setMsg(null);

    try {
      const { error } = await updateMyProfile({
        full_name: fullName.trim() || null,
        headline: headline.trim() || null,
        city: city.trim() || null,
        about: about.trim() || null,
        // даже в edit режиме оставляем onboarded=true
        is_onboarded: true,
        role: "candidate",
      });

      if (error) throw error;

      router.push("/resume");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditMode ? "Редактирование профиля" : "Онбординг соискателя"}
            </h1>
            <p className="text-white/70 mt-1">
              {isEditMode
                ? "Обновите данные профиля."
                : "Заполните профиль — затем откроется список вакансий."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/resume")}
            className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2"
          >
            Назад
          </button>
        </div>

        {msg ? <div className="mt-4 text-sm text-white/70">{msg}</div> : null}

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm text-white/70">ФИО</label>
            <input
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Заголовок (должность)</label>
            <input
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Город</label>
            <input
              className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-white/70">О себе</label>
            <textarea
              className="mt-2 w-full h-[120px] rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-white text-black px-6 py-3 font-semibold disabled:opacity-60"
          >
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CandidateOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
          Загрузка...
        </div>
      }
    >
      <CandidateOnboardingInner />
    </Suspense>
  );
}
