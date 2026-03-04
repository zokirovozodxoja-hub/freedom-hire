"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SaveJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    checkIfSaved();
  }, [jobId]);

  async function checkIfSaved() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setChecking(false);
      return;
    }

    const { data } = await supabase
      .from("saved_jobs")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("job_id", jobId)
      .maybeSingle();

    setIsSaved(!!data);
    setChecking(false);
  }

  async function toggleSave() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push(`/auth?role=candidate&next=/jobs/${jobId}`);
      return;
    }

    setLoading(true);

    if (isSaved) {
      await supabase.from("saved_jobs").delete()
        .eq("user_id", userData.user.id).eq("job_id", jobId);
      setIsSaved(false);
      showToast("Удалено из сохранённых");
    } else {
      await supabase.from("saved_jobs").insert({
        user_id: userData.user.id, job_id: jobId, notes: null,
      });
      setIsSaved(true);
      showToast("Сохранено!");
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/30 text-sm"
      >
        ...
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleSave}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition"
        style={isSaved
          ? { background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }
          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
      >
        <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {loading ? "..." : isSaved ? "Сохранено" : "Сохранить"}
      </button>
      {toast && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-3 py-1.5 rounded-xl pointer-events-none"
          style={{ background: "rgba(7,6,15,0.95)", border: "1px solid rgba(196,173,255,0.2)", color: "var(--lavender)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
