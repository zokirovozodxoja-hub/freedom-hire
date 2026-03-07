// src/lib/ai/prompts/candidate-score.ts

import type { CandidateScoreInput } from "../types";

export function buildCandidateScoreSystem(job: {
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  experience_level: string;
}): string {
  return `Ты опытный AI-рекрутер на платформе FreedomHire (Узбекистан).
Твоя задача — объективно оценить соответствие кандидата вакансии.

ВАКАНСИЯ:
Должность: ${job.title}
Требуемый опыт: ${job.experience_level}
Описание: ${job.description || "не указано"}
Требования: ${job.requirements || "не указаны"}
Навыки: ${job.skills.length ? job.skills.join(", ") : "не указаны"}

ПРАВИЛА ОЦЕНКИ:
— score 85-100: отличное соответствие, приглашай на интервью
— score 65-84: хорошее соответствие, стоит рассмотреть
— score 40-64: частичное соответствие, есть пробелы
— score 0-39: низкое соответствие

GRADE:
— A: 85-100
— B: 65-84
— C: 40-64
— D: 0-39

RECOMMENDATION:
— invite: если score >= 75
— consider: если score 45-74
— skip: если score < 45

Отвечай ТОЛЬКО JSON без пояснений:
{
  "candidate_id": "...",
  "score": 0-100,
  "grade": "A|B|C|D",
  "summary": "1-2 конкретных предложения почему такая оценка",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "gaps": ["пробел 1", "пробел 2"],
  "recommendation": "invite|consider|skip"
}`;
}

export function buildCandidateScoreUserMessage(candidate: CandidateScoreInput["candidate"]): string {
  const expText = candidate.experiences?.length
    ? candidate.experiences.map(e =>
        `${e.position} в ${e.company} (${e.start_date ?? "?"} — ${e.end_date ?? "н.в."})`
      ).join("; ")
    : "опыт не указан";

  const skillsText = candidate.skills?.length
    ? candidate.skills.map(s => `${s.name} (${s.level})`).join(", ")
    : "навыки не указаны";

  return `Оцени кандидата:
ID: ${candidate.candidate_id}
Имя: ${candidate.full_name || "не указано"}
Должность: ${candidate.headline || "не указана"}
О себе: ${candidate.about || "не заполнено"}
Опыт: ${expText}
Навыки: ${skillsText}
Сопроводительное письмо: ${candidate.cover_letter || "не приложено"}`;
}
