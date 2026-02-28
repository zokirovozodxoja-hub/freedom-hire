"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployerLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {/* заголовок */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Работодателям
          </h1>
          <p className="mt-3 max-w-2xl text-white/70 leading-relaxed">
            Создайте компанию, разместите вакансии и получайте отклики. Мы помогаем
            нанимать быстрее и проще.
          </p>

          {/* преимущества */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-white font-semibold">⚡ Быстрое размещение</div>
              <p className="mt-2 text-sm text-white/60">
                Создайте вакансию за пару минут и начните собирать отклики.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-white font-semibold">🎯 Кандидаты по Узбекистану</div>
              <p className="mt-2 text-sm text-white/60">
                Фокус на локальный рынок: Ташкент и другие города.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-white font-semibold">📊 Кабинет работодателя</div>
              <p className="mt-2 text-sm text-white/60">
                Управляйте вакансиями и откликами в одном месте.
              </p>
            </div>
          </div>

          {/* условия сотрудничества */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold">Условия сотрудничества</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="font-semibold">📌 Старт бесплатно</div>
                <p className="mt-2 text-sm text-white/60">
                  Первые вакансии можно разместить бесплатно (для теста платформы).
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="font-semibold">⏱️ Модерация</div>
                <p className="mt-2 text-sm text-white/60">
                  Проверка вакансий — обычно до 24 часов.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="font-semibold">🤝 Поддержка</div>
                <p className="mt-2 text-sm text-white/60">
                  Помогаем с размещением и настройкой вакансий.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="font-semibold">🔒 Прозрачность</div>
                <p className="mt-2 text-sm text-white/60">
                  Без скрытых комиссий. Всё по правилам и понятно.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-3">
            {/* если хочешь — отправляй на регистрацию */}
            <Link
              href="/auth/register"
              className="h-11 px-6 inline-flex items-center justify-center rounded-2xl bg-[#7c3aed] font-semibold text-white hover:bg-[#6d28d9] transition"
            >
              Зарегистрироваться и разместить вакансию
            </Link>

            {/* если пользователь уже зарегистрирован */}
            <Link
              href="/auth/login"
              className="h-11 px-6 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Войти в кабинет
            </Link>

            {/* оставить твою кнопку "Мои вакансии", но логичнее вести туда только после логина */}
            <button
              onClick={() => router.push("/employer/jobs")}
              className="h-11 px-6 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Мои вакансии
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}