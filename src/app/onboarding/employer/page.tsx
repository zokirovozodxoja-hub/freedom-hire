"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type VerificationStatus = "pending" | "approved" | "rejected";

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [inn, setInn] = useState("");
  const [address, setAddress] = useState("");

  const [docs, setDocs] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 1) проверка сессии + роль
  useEffect(() => {
    (async () => {
      setError(null);
      setNotice(null);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/login?next=/onboarding/employer");
        return;
      }

      // Проверяем роль в profiles (источник правды)
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profErr) {
        setError("Не удалось проверить профиль. Попробуйте позже.");
        setLoading(false);
        return;
      }

      if (profile?.role !== "employer") {
        // если вдруг роль не employer — отправляем на общий онбординг/домой
        router.replace("/onboarding");
        return;
      }

      // если компания уже существует — можно отправить в кабинет
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id, verification_status")
        .eq("owner_id", data.user.id)
        .maybeSingle();

      if (existingCompany?.id) {
        router.replace("/employer");
        return;
      }

      setLoading(false);
    })();
  }, [router, supabase]);

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    // Ограничим типы “документные”, чтобы не грузили видео/рандом
    const allowed = arr.filter((f) => {
      const okType =
        f.type.startsWith("image/") ||
        f.type === "application/pdf" ||
        f.type === "application/msword" ||
        f.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const okSize = f.size <= 10 * 1024 * 1024; // 10MB
      return okType && okSize;
    });
    setDocs(allowed.slice(0, 5)); // максимум 5 файлов
  }

  async function submit() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (!companyName.trim()) throw new Error("Введите название компании.");
      if (!inn.trim()) throw new Error("Введите ИНН.");
      if (inn.trim().length < 6) throw new Error("ИНН выглядит слишком коротким.");

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/login?next=/onboarding/employer");
        return;
      }

      if (docs.length === 0) {
        throw new Error("Загрузите хотя бы один документ (PDF/фото).");
      }

      // 2) Загружаем документы в Storage
      const bucket = "company-docs";
      const uploaded: { path: string; name: string; size: number; type: string }[] = [];

      for (const file of docs) {
        const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
        const path = `${data.user.id}/${Date.now()}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: false });

        if (upErr) {
          throw new Error(
            "Не удалось загрузить документ. Проверьте права bucket и попробуйте снова."
          );
        }

        uploaded.push({ path, name: file.name, size: file.size, type: file.type });
      }

      // 3) Создаём компанию со статусом pending
      const status: VerificationStatus = "pending";

      const { error: insErr } = await supabase.from("companies").insert({
        owner_id: data.user.id,
        name: companyName.trim(),
        inn: inn.trim(),
        address: address.trim() || null,
        doc_urls: uploaded, // jsonb
        verification_status: status,
      });

      if (insErr) {
        throw new Error("Не удалось сохранить компанию. Проверьте таблицу companies и RLS.");
      }

      setNotice("Документы отправлены на проверку. Статус: на модерации.");
      // можно сразу вести в кабинет (там покажешь “pending”)
      router.replace("/employer");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка отправки данных");
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
    <main className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Онбординг работодателя
          </h1>
          <p className="mt-2 text-white/60 text-sm">
            Чтобы защитить соискателей от мошенников, мы просим подтвердить компанию.
            Обычно проверка занимает до 24 часов.
          </p>

          <label className="mt-6 block text-sm text-white/70">Название компании</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Например: ABC Group"
            autoComplete="organization"
          />

          <label className="mt-4 block text-sm text-white/70">ИНН</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
            placeholder="Введите ИНН компании"
            inputMode="numeric"
          />

          <label className="mt-4 block text-sm text-white/70">Адрес (необязательно)</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Город, улица"
          />

          <div className="mt-6">
            <div className="text-sm text-white/70">Документы (PDF/фото)</div>
            <p className="mt-1 text-xs text-white/50">
              Можно: свидетельство о регистрации, лицензия, доверенность и т.п.
              До 5 файлов, каждый до 10MB.
            </p>

            <input
              className="mt-3 block w-full text-sm text-white/70"
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => onPickFiles(e.target.files)}
              disabled={saving}
            />

            {docs.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-white/70">
                {docs.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-3">
                    <span className="truncate">{f.name}</span>
                    <span className="text-white/40 text-xs">
                      {Math.round(f.size / 1024)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className="mt-7 w-full rounded-xl bg-[#7c3aed] px-4 py-3 font-semibold hover:bg-[#6d28d9] transition disabled:opacity-60"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Отправляем..." : "Отправить на проверку"}
          </button>

          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          {notice && <p className="mt-3 text-sm text-emerald-300">{notice}</p>}
        </div>
      </div>
    </main>
  );
}