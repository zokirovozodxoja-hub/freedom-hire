import { supabase } from "./supabaseClient";

export type Profile = {
  id: string;
  role: "candidate" | "employer";
  is_onboarded: boolean;

  full_name: string | null;
  headline: string | null;
  city: string | null;
  about: string | null;

  avatar_url: string | null;
  job_search_status: string | null;

  salary_expectation: number | null;
  salary_currency: "UZS" | "USD" | null;
  employment_type: string | null;
  work_schedule: string | null;
  is_visible: boolean | null;
  show_contacts: boolean | null;
};

export async function getMyProfile() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) return { profile: null, user: null, error: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, role, is_onboarded, full_name, headline, city, about, avatar_url, job_search_status, salary_expectation, salary_currency, employment_type, work_schedule, is_visible, show_contacts"
    )
    .eq("id", user.id)
    .single();

  return { profile: (profile as Profile) ?? null, user, error };
}

export async function updateMyProfile(payload: Partial<Profile>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("Not authenticated") };

  // не затираем поля undefined
  const clean: Partial<Profile> = { ...payload };
  (Object.keys(clean) as (keyof Profile)[]).forEach((k) => {
    if (clean[k] === undefined) delete clean[k];
  });

  const { error } = await supabase
    .from("profiles")
    .update(clean)
    .eq("id", user.id);

  return { error };
}
