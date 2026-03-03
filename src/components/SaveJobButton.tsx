"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SaveJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

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
      // Remove
      await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("job_id", jobId);

      setIsSaved(false);
    } else {
      // Add
      await supabase.from("saved_jobs").insert({
        user_id: userData.user.id,
        job_id: jobId,
        notes: null,
      });

      setIsSaved(true);
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
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
        isSaved
          ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
          : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
      }`}
    >
      {loading ? "..." : isSaved ? "❤️ Сохранено" : "🤍 Сохранить"}
    </button>
  );
}
