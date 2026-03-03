"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, [jobId]);

  const checkUserStatus = async () => {
    setCheckingAuth(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setCheckingAuth(false);
      return;
    }

    // Проверяем роль пользователя
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setUserRole(profile?.role || null);

    // Если кандидат, проверяем не откликался ли уже
    if (profile?.role === "candidate") {
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("candidate_id", user.id)
        .eq("job_id", jobId)
        .maybeSingle();

      setHasApplied(!!existing);
    }

    setCheckingAuth(false);
  };

  const onApply = async () => {
    setLoading(true);
    setMessage(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    // Если не авторизован
    if (!user) {
      router.push(`/auth?role=candidate&next=/jobs/${jobId}`);
      setLoading(false);
      return;
    }

    // Если работодатель
    if (userRole === "employer") {
      setMessage("Работодатели не могут откликаться на вакансии");
      setLoading(false);
      return;
    }

    // Проверяем повторно
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (existing) {
      setMessage("Вы уже откликались на эту вакансию");
      setHasApplied(true);
      setLoading(false);
      return;
    }

    // Отправляем отклик
    const { error } = await supabase.from("applications").insert({
      candidate_id: user.id,
      job_id: jobId,
      status: "applied",
      cover_letter: null,
    });

    if (error) {
      setMessage("Ошибка: " + error.message);
    } else {
      setMessage("✅ Отклик успешно отправлен!");
      setHasApplied(true);
      // Перенаправляем на страницу откликов через 2 секунды
      setTimeout(() => {
        router.push("/applications");
      }, 2000);
    }

    setLoading(false);
  };

  // Для работодателя - показываем другую кнопку
  if (userRole === "employer") {
    return (
      <div className="mt-6">
        <button
          disabled
          className="rounded-2xl bg-white/10 border border-white/20 px-5 py-3 font-semibold text-white/40 cursor-not-allowed"
        >
          Вы не можете откликнуться на свою вакансию
        </button>
        <p className="mt-2 text-sm text-white/50">
          Вы вошли как работодатель. Переключитесь на аккаунт кандидата для отклика.
        </p>
      </div>
    );
  }

  // Если уже откликнулся
  if (hasApplied) {
    return (
      <div className="mt-6">
        <button
          disabled
          className="rounded-2xl bg-green-500/20 border border-green-500/30 px-5 py-3 font-semibold text-green-400 cursor-not-allowed"
        >
          ✓ Вы уже откликнулись
        </button>
        <p className="mt-2 text-sm text-white/50">
          Отклик отправлен. Следите за статусом в{" "}
          <a href="/applications" className="text-violet-400 hover:underline">
            личном кабинете
          </a>
          .
        </p>
      </div>
    );
  }

  // Для кандидата или неавторизованного
  return (
    <div className="mt-6">
      <button
        onClick={onApply}
        disabled={loading || checkingAuth}
        className="rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] px-6 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {checkingAuth
          ? "Проверка..."
          : loading
          ? "Отправка..."
          : "Откликнуться"}
      </button>
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.includes("✅")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
      {!checkingAuth && !userRole && (
        <p className="mt-2 text-sm text-white/50">
          Для отклика необходимо{" "}
          <a
            href={`/auth?role=candidate&next=/jobs/${jobId}`}
            className="text-violet-400 hover:underline"
          >
            войти или зарегистрироваться
          </a>
        </p>
      )}
    </div>
  );
}
