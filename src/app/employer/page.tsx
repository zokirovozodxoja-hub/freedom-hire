"use client";

import { useRouter } from "next/navigation";

export default function EmployerLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold">Работодателям</h1>
        <p className="text-white/70 mt-4 leading-relaxed">
          Размещайте вакансии и получайте отклики от соискателей.
        </p>

        <div className="mt-6 flex gap-3 flex-wrap">
          <button
            onClick={() => router.push("/auth?role=employer")}
            className="rounded-2xl bg-white text-black px-5 py-3 font-semibold"
          >
            Войти как работодатель
          </button>

          <button
            onClick={() => router.push("/employer/jobs")}
            className="rounded-2xl bg-white/10 border border-white/10 px-5 py-3"
          >
            Мои вакансии
          </button>
        </div>
      </div>
    </div>
  );
}