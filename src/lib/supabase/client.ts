import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type EnvName = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function getRequiredEnvVar(name: EnvName) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing Supabase environment variable: ${name}`);
  return value;
}

const supabaseUrl = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export function createClient() {
  return supabase;
}