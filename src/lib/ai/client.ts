// src/lib/ai/client.ts
// Базовый клиент для Anthropic API.
// Все AI-роуты используют этот клиент — не пишут fetch напрямую.
// Расширяется: streaming, file uploads, tool use — всё здесь.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AnthropicCallOptions = {
  system: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
  temperature?: number;
  model?: string;
};

export type AnthropicCallResult =
  | { ok: true; text: string }
  | { ok: false; code: "rate_limit" | "api_error"; message: string };

/**
 * Единый вызов Anthropic API для всех server-side AI функций.
 * Используется ТОЛЬКО в API routes (server-side).
 */
export async function callAnthropic(
  options: AnthropicCallOptions
): Promise<AnthropicCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "api_error",
      message: "ANTHROPIC_API_KEY not configured",
    };
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        max_tokens: options.max_tokens ?? 2000,
        temperature: options.temperature ?? 0.7,
        system: options.system,
        messages: options.messages,
      }),
    });

    const data = await response.json();

    if (response.status === 429) {
      return { ok: false, code: "rate_limit", message: "Rate limit exceeded" };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "api_error",
        message: data.error?.message ?? `API error ${response.status}`,
      };
    }

    const text: string = data.content?.[0]?.text ?? "";
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      code: "api_error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Парсит JSON из текста модели.
 * Модель может обернуть JSON в markdown — это обрабатывается.
 */
export function parseAIJson<T>(text: string): T | null {
  try {
    // Убираем markdown-обёртку если есть
    const clean = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    // Ищем JSON объект или массив
    const match = clean.match(/[\[{][\s\S]*[\]}]/);
    if (!match) return null;

    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
