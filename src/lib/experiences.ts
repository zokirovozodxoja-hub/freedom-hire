import { supabase } from "./supabaseClient";

export type Experience = {
  id: string;
  company: string | null;
  position: string | null;
  start_date: string | null;
  end_date: string | null;
};

export async function listMyExperiences() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { items: [], error: null };

  const { data, error } = await supabase
    .from("candidate_experiences")
    .select("id, company, position, start_date, end_date")
    .eq("profile_id", user.id)
    .order("start_date", { ascending: false });

  return { items: (data ?? []) as Experience[], error };
}

export async function addExperience(payload: Omit<Experience, "id">) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: { message: "Not authorized" } as any };

  const { error } = await supabase.from("candidate_experiences").insert({
    profile_id: user.id,
    ...payload,
  });

  return { error };
}

export async function updateExperience(id: string, patch: Partial<Omit<Experience, "id">>) {
  const { error } = await supabase
    .from("candidate_experiences")
    .update(patch)
    .eq("id", id);

  return { error };
}

export async function deleteExperience(id: string) {
  const { error } = await supabase
    .from("candidate_experiences")
    .delete()
    .eq("id", id);

  return { error };
}