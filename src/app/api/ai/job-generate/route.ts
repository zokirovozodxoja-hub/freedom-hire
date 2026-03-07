// src/app/api/ai/job-generate/route.ts
// API route для генерации вакансии.
// Отдельный route на каждый AI-модуль — не монолитный /api/ai.
// Следующие модули: /api/ai/candidate-score, /api/ai/shortlist, /api/ai/interview

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAnthropic, parseAIJson } from "@/lib/ai/client";
import { buildJobGenerateSystem, buildJobGenerateUserMessage } from "@/lib/ai/prompts/job-generate";
import type { JobGenerateInput, JobGenerateOutput, AIResponse } from "@/lib/ai/types";

export async function POST(
  req: NextRequest
): Promise<NextResponse<AIResponse<JobGenerateOutput>>> {
  // 1. Auth — только авторизованный работодатель
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // 2. Parse & validate input
  let input: JobGenerateInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!input.prompt?.trim()) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_error", message: "prompt is required" } },
      { status: 400 }
    );
  }

  // 3. Логируем вызов в ai_usage_logs (для аналитики и rate limiting в будущем)
  // Не блокируем — fire and forget
  supabase.from("ai_usage_logs").insert({
    user_id: user.id,
    module: "job_generate",
    input_summary: input.prompt.slice(0, 200),
  }).then(() => {});

  // 4. Вызов AI
  const result = await callAnthropic({
    system: buildJobGenerateSystem(input),
    messages: [
      { role: "user", content: buildJobGenerateUserMessage(input.prompt) }
    ],
    temperature: 0.75,
    max_tokens: 2000,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: result.code === "rate_limit" ? 429 : 500 }
    );
  }

  // 5. Parse JSON из ответа
  const parsed = parseAIJson<JobGenerateOutput>(result.text);

  if (!parsed || !parsed.title || !parsed.description) {
    return NextResponse.json(
      { ok: false, error: { code: "parse_error", message: "AI вернул неожиданный формат" } },
      { status: 500 }
    );
  }

  // 6. Санитизируем — убираем возможные пустые поля
  const output: JobGenerateOutput = {
    title: parsed.title ?? "",
    description: parsed.description ?? "",
    responsibilities: parsed.responsibilities ?? "",
    requirements: parsed.requirements ?? "",
    benefits: parsed.benefits ?? "",
    company_offers: parsed.company_offers ?? "",
    suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags : [],
    suggested_salary_from: parsed.suggested_salary_from ?? undefined,
    suggested_salary_to: parsed.suggested_salary_to ?? undefined,
    generation_notes: parsed.generation_notes ?? undefined,
  };

  return NextResponse.json({ ok: true, data: output });
}
