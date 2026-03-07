// src/app/api/ai/shortlist/route.ts
// v2: принимает scores прямо в теле запроса — не зависит от ai_candidate_scores.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AIResponse } from "@/lib/ai/types";

type ScoreEntry = {
  candidate_id: string;
  score: number;
  grade: string;
  summary: string;
  recommendation: string;
};

type RequestBody = {
  job_id: string;
  limit?: number;
  scores: ScoreEntry[];
};

type ShortlistEntry = {
  candidate_id: string;
  score: number;
  grade: string;
  summary: string;
  recommendation: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  experience_years: number | null;
  skills: { name: string; level: string }[];
};

type ShortlistResult = {
  shortlist_id: string;
  job_id: string;
  job_title: string;
  entries: ShortlistEntry[];
  created_at: string;
};

export async function POST(
  req: NextRequest
): Promise<NextResponse<AIResponse<ShortlistResult>>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: RequestBody;
  try { body = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { job_id, limit = 5, scores } = body;

  if (!job_id) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "job_id required" } },
      { status: 400 }
    );
  }

  if (!scores?.length) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Сначала запустите AI-анализ кандидатов" } },
      { status: 400 }
    );
  }

  const { data: job } = await supabase.from("jobs")
    .select("id, title, company_id, companies(owner_id)")
    .eq("id", job_id)
    .single();

  if (!job || (job.companies as any)?.owner_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Job not found or access denied" } },
      { status: 403 }
    );
  }

  const topScores = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const candidateIds = topScores.map(s => s.candidate_id);

  const [profilesRes, skillsRes] = await Promise.all([
    supabase.from("profiles")
      .select("id, full_name, headline, city, experience_years")
      .in("id", candidateIds),
    supabase.from("candidate_skills")
      .select("user_id, name, level")
      .in("user_id", candidateIds),
  ]);

  const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
  const skillsMap = new Map<string, { name: string; level: string }[]>();
  (skillsRes.data ?? []).forEach((s: any) => {
    if (!skillsMap.has(s.user_id)) skillsMap.set(s.user_id, []);
    skillsMap.get(s.user_id)!.push({ name: s.name, level: s.level });
  });

  const entries: ShortlistEntry[] = topScores.map(s => {
    const profile = profilesMap.get(s.candidate_id) as any;
    return {
      candidate_id: s.candidate_id,
      score: s.score,
      grade: s.grade,
      summary: s.summary,
      recommendation: s.recommendation,
      full_name: profile?.full_name ?? null,
      headline: profile?.headline ?? null,
      city: profile?.city ?? null,
      experience_years: profile?.experience_years ?? null,
      skills: skillsMap.get(s.candidate_id) ?? [],
    };
  });

  const { data: saved, error: saveErr } = await supabase
    .from("ai_shortlists")
    .upsert({
      job_id,
      created_by: user.id,
      candidate_ids: entries.map(e => e.candidate_id),
      scores: entries,
      status: "active",
    }, { onConflict: "job_id,created_by" })
    .select("id, created_at")
    .single();

  if (saveErr || !saved) {
    return NextResponse.json(
      { ok: false, error: { code: "api_error", message: saveErr?.message ?? "Save failed" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      shortlist_id: saved.id,
      job_id,
      job_title: job.title ?? "",
      entries,
      created_at: saved.created_at,
    },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const job_id = req.nextUrl.searchParams.get("job_id");
  if (!job_id) return NextResponse.json({ ok: false, error: "job_id required" }, { status: 400 });

  const { data } = await supabase.from("ai_shortlists")
    .select("id, job_id, candidate_ids, scores, status, created_at, jobs(title)")
    .eq("job_id", job_id)
    .eq("created_by", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return NextResponse.json({ ok: true, data: null });
  return NextResponse.json({ ok: true, data });
}
