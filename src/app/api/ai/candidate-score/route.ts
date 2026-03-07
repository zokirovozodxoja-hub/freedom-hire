// src/app/api/ai/candidate-score/route.ts
// Принимает список кандидатов + контекст вакансии.
// Возвращает оценки для каждого кандидата.
// Оценки НЕ сохраняются в БД автоматически — клиент решает сохранять или нет.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAnthropic, parseAIJson } from "@/lib/ai/client";
import { buildCandidateScoreSystem, buildCandidateScoreUserMessage } from "@/lib/ai/prompts/candidate-score";
import type { CandidateScoreInput, CandidateScoreOutput, AIResponse } from "@/lib/ai/types";

type RequestBody = {
  job: {
    id: string;
    title: string;
    description: string;
    requirements: string;
    skills: string[];
    experience_level: string;
  };
  candidates: CandidateScoreInput["candidate"][];
};

type BatchResponse = AIResponse<CandidateScoreOutput[]>;

export async function POST(req: NextRequest): Promise<NextResponse<BatchResponse>> {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const { job, candidates } = body;
  if (!job?.title || !candidates?.length) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "job and candidates required" } },
      { status: 400 }
    );
  }

  // Логируем
  supabase.from("ai_usage_logs").insert({
    user_id: user.id,
    module: "candidate_score",
    input_summary: `job: ${job.title}, candidates: ${candidates.length}`,
  }).then(() => {});

  const system = buildCandidateScoreSystem(job);

  // Оцениваем всех кандидатов параллельно (до 10 за раз)
  const BATCH_SIZE = 10;
  const results: CandidateScoreOutput[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (candidate) => {
      const res = await callAnthropic({
        system,
        messages: [{ role: "user", content: buildCandidateScoreUserMessage(candidate) }],
        temperature: 0,
        max_tokens: 600,
      });

      if (!res.ok) return null;

      const parsed = parseAIJson<CandidateScoreOutput>(res.text);
      if (!parsed) return null;

      return {
        candidate_id: candidate.candidate_id,
        score: Math.min(100, Math.max(0, parsed.score ?? 0)),
        grade: parsed.grade ?? "D",
        summary: parsed.summary ?? "",
        strengths: parsed.strengths ?? [],
        gaps: parsed.gaps ?? [],
        recommendation: parsed.recommendation ?? "skip",
      } as CandidateScoreOutput;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean) as CandidateScoreOutput[]);
  }

  // Сохраняем оценки в БД
  if (results.length > 0) {
    const rows = results.map(r => ({
      job_id: job.id,
      candidate_id: r.candidate_id,
      score: r.score,
      grade: r.grade,
      summary: r.summary,
      strengths: r.strengths,
      gaps: r.gaps,
      recommendation: r.recommendation,
      raw_output: r,
    }));

    // upsert — если оценка уже есть, обновляем
    await supabase.from("ai_candidate_scores").upsert(rows, {
      onConflict: "job_id,candidate_id",
    });
  }

  // Сортируем по score убыванию
  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ ok: true, data: results });
}
