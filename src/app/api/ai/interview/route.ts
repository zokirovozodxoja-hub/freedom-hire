// src/app/api/ai/interview/route.ts
// Три действия: start, answer, evaluate
// start  — генерирует первый вопрос
// answer — анализирует ответ (AI-детектор) + генерирует следующий вопрос
// evaluate — финальная оценка после всех вопросов

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAnthropic, parseAIJson } from "@/lib/ai/client";
import {
  buildInterviewSystem,
  buildAIDetectorSystem,
  buildInterviewEvalSystem,
  type InterviewContext,
  type InterviewMessage,
} from "@/lib/ai/prompts/interview";

type RequestBody =
  | { action: "start"; job_id: string; candidate_id: string; application_id: string }
  | { action: "answer"; session_id: string; answer: string }
  | { action: "evaluate"; session_id: string };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: RequestBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  // ── START ─────────────────────────────────────────────

  if (body.action === "start") {
    const { job_id, candidate_id, application_id } = body;

    // Загружаем контекст
    const [jobRes, candidateRes, appRes] = await Promise.all([
      supabase.from("jobs").select("title,description,requirements,tags,experience_level").eq("id", job_id).single(),
      supabase.from("profiles").select("full_name,headline,experience").eq("id", candidate_id).single(),
      supabase.from("candidate_skills").select("name,level").eq("user_id", candidate_id).limit(10),
    ]);

    const job = jobRes.data;
    const candidate = candidateRes.data;
    if (!job) return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });

    const ctx: InterviewContext = {
      job_title: job.title ?? "",
      job_description: job.description ?? "",
      job_requirements: job.requirements ?? "",
      candidate_name: candidate?.full_name ?? "Кандидат",
      candidate_headline: candidate?.headline ?? "",
      candidate_skills: (appRes.data ?? []).map((s: any) => s.name),
      candidate_experience: candidate?.experience ?? "",
      messages: [],
    };

    // Генерируем первый вопрос
    const res = await callAnthropic({
      system: buildInterviewSystem(ctx),
      messages: [{ role: "user", content: "Начни интервью. Задай первый вопрос." }],
      temperature: 0.7,
      max_tokens: 400,
    });

    if (!res.ok) return NextResponse.json({ ok: false, error: res.message ?? "API error" }, { status: 500 });

    const parsed = parseAIJson<{ question: string; is_final: boolean; topic: string }>(res.text);
    const firstQuestion = parsed?.question ?? "Расскажите о себе и вашем опыте работы.";

    // Создаём сессию в БД
    const { data: session, error: sessionErr } = await supabase.from("ai_interviews")
      .insert({
        job_id,
        candidate_id,
        application_id,
        messages: [{ role: "interviewer", content: firstQuestion }],
        status: "in_progress",
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ ok: false, error: sessionErr?.message ?? "Session create failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        session_id: session.id,
        question: firstQuestion,
        question_number: 1,
        total_questions: 5,
        is_final: false,
      },
    });
  }

  // ── ANSWER ────────────────────────────────────────────

  if (body.action === "answer") {
    const { session_id, answer } = body;

    // Загружаем сессию
    const { data: session } = await supabase.from("ai_interviews")
      .select("id,job_id,candidate_id,messages,status")
      .eq("id", session_id)
      .single();

    if (!session || session.status !== "in_progress") {
      return NextResponse.json({ ok: false, error: "Session not found or completed" }, { status: 404 });
    }

    const messages: InterviewMessage[] = Array.isArray(session.messages) ? session.messages : [];
    const questionCount = messages.filter(m => m.role === "interviewer").length;

    // Параллельно: AI-детектор + следующий вопрос
    const [jobRes, candidateRes, skillsRes] = await Promise.all([
      supabase.from("jobs").select("title,description,requirements").eq("id", session.job_id).single(),
      supabase.from("profiles").select("full_name,headline,experience").eq("id", session.candidate_id).single(),
      supabase.from("candidate_skills").select("name").eq("user_id", session.candidate_id).limit(10),
    ]);

    const ctx: InterviewContext = {
      job_title: jobRes.data?.title ?? "",
      job_description: jobRes.data?.description ?? "",
      job_requirements: jobRes.data?.requirements ?? "",
      candidate_name: candidateRes.data?.full_name ?? "Кандидат",
      candidate_headline: candidateRes.data?.headline ?? "",
      candidate_skills: (skillsRes.data ?? []).map((s: any) => s.name),
      candidate_experience: candidateRes.data?.experience ?? "",
      messages: [...messages, { role: "candidate", content: answer }],
    };

    // AI-детектор и следующий вопрос — параллельно
    const [detectorRes, nextQuestionRes] = await Promise.all([
      callAnthropic({
        system: buildAIDetectorSystem(),
        messages: [{ role: "user", content: `Анализируй этот ответ кандидата:\n\n"${answer}"` }],
        temperature: 0,
        max_tokens: 200,
      }),
      callAnthropic({
        system: buildInterviewSystem(ctx),
        messages: [
          ...messages.map(m => ({
            role: m.role === "interviewer" ? "assistant" as const : "user" as const,
            content: m.content,
          })),
          { role: "user", content: answer },
        ],
        temperature: 0.75,
        max_tokens: 400,
      }),
    ]);

    // Парсим детектор
    const detection = parseAIJson<{ ai_probability: number; ai_flag: boolean; reason: string }>(
      detectorRes.ok ? detectorRes.text : ""
    );

    // Парсим следующий вопрос
    const nextParsed = parseAIJson<{ question: string; is_final: boolean; topic: string }>(
      nextQuestionRes.ok ? nextQuestionRes.text : ""
    );

    const isFinal = (nextParsed?.is_final ?? false) || questionCount >= 4;
    const nextQuestion = isFinal
      ? "Спасибо за ответы! Интервью завершено."
      : (nextParsed?.question ?? "Расскажите подробнее.");

    // Обновляем сессию
    const updatedMessages: InterviewMessage[] = [
      ...messages,
      {
        role: "candidate",
        content: answer,
        ai_flag: detection?.ai_flag ?? false,
      },
      ...(!isFinal ? [{ role: "interviewer" as const, content: nextQuestion }] : []),
    ];

    await supabase.from("ai_interviews")
      .update({
        messages: updatedMessages,
        status: isFinal ? "completed" : "in_progress",
      })
      .eq("id", session_id);

    return NextResponse.json({
      ok: true,
      data: {
        session_id,
        question: isFinal ? null : nextQuestion,
        question_number: questionCount + 1,
        total_questions: 5,
        is_final: isFinal,
        ai_detection: {
          flagged: detection?.ai_flag ?? false,
          probability: detection?.ai_probability ?? 0,
          reason: detection?.reason ?? "",
        },
      },
    });
  }

  // ── EVALUATE ──────────────────────────────────────────

  if (body.action === "evaluate") {
    const { session_id } = body;

    const { data: session } = await supabase.from("ai_interviews")
      .select("id,job_id,candidate_id,messages")
      .eq("id", session_id)
      .single();

    if (!session) return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });

    const [jobRes, candidateRes] = await Promise.all([
      supabase.from("jobs").select("title,description,requirements").eq("id", session.job_id).single(),
      supabase.from("profiles").select("full_name,headline").eq("id", session.candidate_id).single(),
    ]);

    const messages: InterviewMessage[] = Array.isArray(session.messages) ? session.messages : [];
    const aiFlags = messages.filter(m => m.role === "candidate" && m.ai_flag).length;
    const totalAnswers = messages.filter(m => m.role === "candidate").length;

    // Формируем транскрипт для оценки
    const transcript = messages.map(m =>
      `${m.role === "interviewer" ? "Интервьюер" : "Кандидат"}: ${m.content}`
    ).join("\n\n");

    const ctx: InterviewContext = {
      job_title: jobRes.data?.title ?? "",
      job_description: jobRes.data?.description ?? "",
      job_requirements: jobRes.data?.requirements ?? "",
      candidate_name: candidateRes.data?.full_name ?? "Кандидат",
      candidate_headline: candidateRes.data?.headline ?? "",
      candidate_skills: [],
      candidate_experience: "",
      messages,
    };

    const evalRes = await callAnthropic({
      system: buildInterviewEvalSystem(ctx),
      messages: [{
        role: "user",
        content: `Вот полный транскрипт интервью:\n\n${transcript}\n\nAI-флагов на ответах: ${aiFlags} из ${totalAnswers}`,
      }],
      temperature: 0,
      max_tokens: 800,
    });

    if (!evalRes.ok) return NextResponse.json({ ok: false, error: evalRes.message ?? "API error" }, { status: 500 });

    const evaluation = parseAIJson<{
      overall_score: number;
      grade: string;
      recommendation: string;
      summary: string;
      strengths: string[];
      concerns: string[];
      ai_usage_detected: boolean;
      ai_usage_summary: string;
    }>(evalRes.text);

    if (!evaluation) return NextResponse.json({ ok: false, error: "Parse error" }, { status: 500 });

    // Сохраняем итоговую оценку
    await supabase.from("ai_interviews").update({
      final_score: evaluation.overall_score,
      final_summary: evaluation.summary,
      recommendation: evaluation.recommendation,
      status: "completed",
    }).eq("id", session_id);

    return NextResponse.json({ ok: true, data: evaluation });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}

// GET — загрузить существующее интервью
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const application_id = req.nextUrl.searchParams.get("application_id");
  if (!application_id) return NextResponse.json({ ok: false }, { status: 400 });

  const { data } = await supabase.from("ai_interviews")
    .select("id,status,final_score,recommendation,final_summary,messages,created_at")
    .eq("application_id", application_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ ok: true, data: data ?? null });
}
