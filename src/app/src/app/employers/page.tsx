import Link from "next/link";

export default function EmployersLanding() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-white p-6">
      <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">Работодателям</h1>
        <p className="text-white/70 mt-3 leading-relaxed">
          Создайте компанию, разместите вакансии и получайте отклики.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth?role=employer"
            className="rounded-2xl bg-white text-black px-6 py-3 font-semibold"
          >
            Войти как работодатель
          </Link>

          <Link
            href="/employer"
            className="rounded-2xl bg-white/10 border border-white/10 px-6 py-3"
          >
            Перейти в кабинет работодателя
          </Link>
        </div>
      </div>
    </main>
  );
}
