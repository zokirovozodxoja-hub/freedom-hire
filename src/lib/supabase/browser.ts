"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __freedomHireSupabaseClient: SupabaseClient | undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase =
  globalThis.__freedomHireSupabaseClient ??
  createClient(supabaseUrl, supabaseAnonKey);

if (!globalThis.__freedomHireSupabaseClient) {
  globalThis.__freedomHireSupabaseClient = supabase;
}
