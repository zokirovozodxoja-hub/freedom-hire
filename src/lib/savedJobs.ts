import { supabase } from "@/lib/supabase/browser";

export async function listMySavedJobs() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { items: [], error: null };

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("created_at, jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { items: data ?? [], error };
}

export async function saveJob(jobId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase.from("saved_jobs").insert({
    user_id: user.id,
    job_id: jobId,
  });

  return { error };
}

export async function unsaveJob(jobId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  return { error };
}