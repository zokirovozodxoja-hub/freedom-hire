import { supabase } from "@/lib/supabase/browser";

export async function listMyApplications() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { items: [], error: null };

  const { data, error } = await supabase
    .from("applications")
    .select("id, created_at, status, cover_letter, job_id, jobs(*)")
    .eq("candidate_id", user.id)
    .order("created_at", { ascending: false });

  return { items: data ?? [], error };
}