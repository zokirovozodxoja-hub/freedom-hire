import { supabase } from "./supabaseClient";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert" | "junior";

export type Skill = {
  id: string;
  name: string;
  level: SkillLevel;
  created_at?: string;
};

export async function listMySkills() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { items: [], error: null };

  const { data, error } = await supabase
    .from("candidate_skills")
    .select("id, name, level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { items: (data ?? []) as Skill[], error };
}

export async function addSkill(name: string, level: SkillLevel) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("Not authorized") };

  const { error } = await supabase.from("candidate_skills").insert({
    user_id: user.id,
    name,
    level,
  });

  return { error };
}

export async function deleteSkill(id: string) {
  const { error } = await supabase
    .from("candidate_skills")
    .delete()
    .eq("id", id);

  return { error };
}