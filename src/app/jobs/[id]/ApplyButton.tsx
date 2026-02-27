"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onApply = async () => {
    setLoading(true);
    setMessage(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      router.push(`/auth?role=candidate&next=/jobs/${jobId}`);
      setLoading(false);
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (existingError) {
      setMessage(existingError.message);
      setLoading(false);
      return;
    }

    if (existing?.id) {
      setMessage("Вы уже откликались на эту вакансию.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("applications").insert({
      candidate_id: user.id,
      job_id: jobId,
      status: "applied",
      cover_letter: null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Отклик отправлен.");
    }

    setLoading(false);
  };

  return (
    <div className="mt-6">
      <button
        onClick={onApply}
        disabled={loading}
        className="rounded-2xl bg-white px-5 py-2 font-semibold text-black disabled:opacity-70"
      >
        {loading ? "Отправка..." : "Откликнуться"}
      </button>
      {message ? <p className="mt-2 text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
