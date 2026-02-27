import { createClient } from "./supabase/client";

export type Status =
  | "actively_looking"
  | "open_to_offers"
  | "not_looking";

export type Currency = "UZS" | "USD";

export type Profile = {
  id: string;

  // 🔹 базовые
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;

  headline?: string | null;
  title?: string | null;
  about?: string | null;

  city?: string | null;
  location?: string | null;

  phone?: string | null;
  telegram?: string | null;

  role?: "candidate" | "employer" | null;

  // 🔹 онбординг
  is_onboarded?: boolean | null;
  onboarding_done?: boolean | null;

  // 🔹 работа
  job_search_status?: Status | null;
  salary_expectation?: number | null;
  salary_currency?: Currency | null;

  avatar_url?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type LibError = { message: string };

export type GetMyProfileResponse = {
  user: any | null;
  profile: Profile | null;
  error: LibError | null;
};

export type UpdateMyProfileResponse = {
  profile: Profile | null;
  error: LibError | null;
};

function toErr(e: unknown): LibError {
  if (!e) return { message: "Unknown error" };
  if (typeof e === "string") return { message: e };
  const anyE = e as any;
  if (anyE?.message && typeof anyE.message === "string")
    return { message: anyE.message };
  return { message: "Unknown error" };
}

export async function getMyProfile(): Promise<GetMyProfileResponse> {
  try {
    const supabase = createClient();

    const { data: userRes, error: userErr } =
      await supabase.auth.getUser();
    if (userErr)
      return { user: null, profile: null, error: toErr(userErr) };

    const user = userRes.user;
    if (!user)
      return { user: null, profile: null, error: null };

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr)
      return { user, profile: null, error: toErr(pErr) };

    return {
      user,
      profile: (profile as Profile | null) ?? null,
      error: null,
    };
  } catch (e) {
    return { user: null, profile: null, error: toErr(e) };
  }
}

export async function updateMyProfile(
  patch: Partial<Omit<Profile, "id">>
): Promise<UpdateMyProfileResponse> {
  try {
    const supabase = createClient();

    const { data: userRes, error: userErr } =
      await supabase.auth.getUser();
    if (userErr)
      return { profile: null, error: toErr(userErr) };

    const user = userRes.user;
    if (!user)
      return {
        profile: null,
        error: { message: "Not authenticated" },
      };

    const payload = {
      id: user.id,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error)
      return { profile: null, error: toErr(error) };

    return {
      profile: data as Profile,
      error: null,
    };
  } catch (e) {
    return { profile: null, error: toErr(e) };
  }
}