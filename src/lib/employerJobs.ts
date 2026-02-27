import { supabase } from "@/lib/supabaseClient";

export type Company = {
  id: string;
  name: string | null;
};

export type CreateJobInput = {
  company_id: string;
  title: string;
  city: string | null;
  description: string | null;

  employment_type: string | null;
  employment_kind: string | null;
  work_format: string | null;

  salary_from: number | null;
  salary_to: number | null;

  min_experience_years: number | null;
  seniority: string | null;
  education_level: string | null;
};

export async function getMyCompanies() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return { items: [] as Company[], error: userError };
  if (!user)
    return {
      items: [] as Company[],
      error: new Error("Not authenticated"),
    };

  const { data, error } = await supabase
    .from("companies")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return { items: (data ?? []) as Company[], error };
}

export async function createJob(input: CreateJobInput) {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      company_id: input.company_id,
      title: input.title ?? "",

      // НИКОГДА НЕ ОТПРАВЛЯЕМ NULL В NOT NULL ПОЛЯ
      city: input.city ?? "",
      description: input.description ?? "",

      employment_type: input.employment_type ?? "",
      employment_kind: input.employment_kind ?? "",
      work_format: input.work_format ?? "",

      salary_from: input.salary_from ?? 0,
      salary_to: input.salary_to ?? 0,

      min_experience_years: input.min_experience_years ?? 0,
      seniority: input.seniority ?? "",
      education_level: input.education_level ?? "",

      is_active: true,
    })
    .select("id")
    .single();

  return { jobId: data?.id as string | undefined, error };
}

export async function addJobSkill(jobId: string, name: string) {
  const { error } = await supabase.from("job_skills").insert({
    job_id: jobId,
    name,
  });
  return { error };
}