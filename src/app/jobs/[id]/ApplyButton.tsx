"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setChecking(false); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", authData.user.id).single();
      setUserRole(profile?.role ?? null);

      if (profile?.role === "candidate") {
        const { data: existing } = await supabase
          .from("applications").select("id")
          .eq("candidate_id", authData.user.id).eq("job_id", jobId).maybeSingle();
        setHasApplied(!!existing);
      }
      setChecking(false);
    })();
  }, [jobId]);

  async function submit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push(`/auth?role=candidate&next=/jobs/${jobId}`);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("applications").select("id")
      .eq("candidate_id", authData.user.id).eq("job_id", jobId).maybeSingle();

    if (existing) {
      setHasApplied(true);
      setLoading(false);
      return;
    }

    const { error: insertErr } = await supabase.from("applications").insert({
      candidate_id: authData.user.id,
      job_id: jobId,
      status: "applied",
      cover_letter: coverLetter.trim() || null,
    });

    if (insertErr) {
      setError("Ошибка: " + insertErr.message);
    } else {
      setSuccess(true);
      setHasApplied(true);
      setShowCoverLetter(false);
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="w-full h-12 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
    );
  }

  if (userRole === "employer") {
    return (
      <div className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
        Войдите как кандидат, чтобы откликнуться
      </div>
    );
  }

  if (success || hasApplied) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-center rounded-2xl py-3 font-semibold text-sm"
          style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Отклик отправлен
        </div>
        <a href="/applications" className="block text-center text-xs transition"
          style={{ color: "var(--lavender)" }}>
          Следить за статусом →
        </a>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="space-y-3">
        <a href={`/auth?role=candidate&next=/jobs/${jobId}`}
          className="btn-primary flex items-center justify-center gap-2 w-full rounded-2xl py-3 font-semibold text-white text-sm">
          Откликнуться
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
          Необходима{" "}
          <a href={`/auth?role=candidate&next=/jobs/${jobId}`} style={{ color: "var(--lavender)" }}>авторизация</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showCoverLetter ? (
        <>
          <button onClick={() => setShowCoverLetter(true)}
            className="btn-primary flex items-center justify-center gap-2 w-full rounded-2xl py-3 font-semibold text-white text-sm">
            Откликнуться
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <button onClick={submit} disabled={loading}
            className="w-full rounded-2xl py-2 text-xs font-body transition"
            style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {loading ? "Отправка..." : "Быстрый отклик без письма"}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-body" style={{ color: "rgba(255,255,255,0.5)" }}>
            Сопроводительное письмо <span style={{ color: "rgba(255,255,255,0.3)" }}>(необязательно)</span>
          </label>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={4}
            placeholder="Расскажите, почему вы подходите для этой роли..."
            className="w-full rounded-xl px-3 py-2.5 text-sm font-body text-white placeholder-white/25 focus:outline-none resize-none transition"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,173,255,0.15)" }}
          />
          <div className="flex gap-2">
            <button onClick={submit} disabled={loading}
              className="btn-primary flex-1 rounded-xl py-2.5 font-semibold text-white text-sm disabled:opacity-60">
              {loading ? "Отправка..." : "Отправить отклик"}
            </button>
            <button onClick={() => setShowCoverLetter(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-body transition"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs rounded-xl px-3 py-2"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}
    </div>
  );
}
