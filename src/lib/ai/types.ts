// src/lib/ai/types.ts
// Центральный файл типов для всего AI-модуля FreedomHire.
// При добавлении нового модуля (кандидаты, интервью, shortlist)
// добавляйте типы СЮДА — не создавайте отдельные файлы типов.

// ─── Общие ───────────────────────────────────────────

export type AIModule =
  | "job_generate"     // Генерация вакансии
  | "candidate_score"  // Оценка кандидата (следующий этап)
  | "shortlist"        // Shortlist кандидатов (следующий этап)
  | "interview"        // AI-интервью (следующий этап)
  | "recruiter_chat";  // Чат с AI-рекрутером

export type AIError = {
  code: "rate_limit" | "api_error" | "parse_error" | "validation_error";
  message: string;
};

export type AIResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: AIError };

// ─── Генерация вакансии ───────────────────────────────

export type JobGenerateInput = {
  // Минимальный промпт от пользователя
  prompt: string;
  // Контекст компании (если известен)
  company_name?: string;
  company_description?: string;
  // Подсказки из формы (если частично заполнена)
  hints?: {
    title?: string;
    city?: string;
    experience_level?: string;
    employment_type?: string;
    salary_from?: number;
    salary_to?: number;
  };
};

export type JobGenerateOutput = {
  // Поля которые заполняет AI — точно соответствуют полям формы
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  company_offers: string;
  // Мета
  suggested_tags: string[];
  suggested_salary_from?: number;
  suggested_salary_to?: number;
  // Для отображения пользователю
  generation_notes?: string; // что AI предположил
};

// ─── Оценка кандидата (следующий этап) ───────────────

export type CandidateScoreInput = {
  job_id: string;
  job_title: string;
  job_description: string;
  job_requirements: string;
  required_skills: string[];
  experience_level: string;
  candidate: {
    candidate_id: string;
    full_name?: string;
    headline?: string;
    about?: string;
    skills: { name: string; level: string }[];
    experiences: { company: string; position: string; start_date: string | null; end_date: string | null }[];
    cover_letter?: string;
  };
};

export type CandidateScoreOutput = {
  candidate_id: string;
  score: number;           // 0-100
  grade: "A" | "B" | "C" | "D";
  summary: string;         // 1-2 предложения
  strengths: string[];
  gaps: string[];
  recommendation: "invite" | "consider" | "skip";
};

// ─── Shortlist (следующий этап) ───────────────────────

export type ShortlistInput = {
  job_id: string;
  job_context: Pick<JobGenerateOutput, "title" | "description" | "requirements">;
  candidates: CandidateScoreInput["candidate"][];
  limit?: number; // сколько выбрать, default 5
};

export type ShortlistOutput = {
  shortlisted: CandidateScoreOutput[];
  total_analyzed: number;
};

// ─── AI-интервью (следующий этап) ────────────────────

export type InterviewMessage = {
  role: "ai" | "candidate";
  content: string;
  timestamp: string;
};

export type InterviewInput = {
  job_title: string;
  job_requirements: string;
  candidate_name?: string;
  messages: InterviewMessage[];
};

export type InterviewOutput = {
  next_question: string;
  is_complete: boolean;
  // Заполняется только когда is_complete = true
  evaluation?: {
    score: number;
    summary: string;
    recommendation: "invite" | "consider" | "skip";
  };
};
