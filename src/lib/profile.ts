export type Status =
  | "actively_looking"
  | "open_to_offers"
  | "not_looking";

export type Currency = "UZS" | "USD";

export type Profile = {
  id: string;

  // Основная информация
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  about?: string | null;

  // Контакты
  phone?: string | null;
  telegram?: string | null;
  location?: string | null;

  // Поиск работы
  job_search_status?: Status | null;

  // Зарплата
  salary_expectation?: number | null;
  salary_currency?: Currency | null;

  // Роль
  role?: "candidate" | "employer" | null;

  // Системные поля
  onboarding_done?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};