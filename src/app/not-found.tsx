import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold mb-4" style={{ color: "var(--lavender)" }}>404</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--chalk)" }}>
          Страница не найдена
        </h1>
        <p className="mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          К сожалению, запрашиваемая страница не существует или была удалена.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            href="/"
            className="btn-primary px-6 py-3 rounded-xl font-semibold text-white transition"
          >
            На главную
          </Link>
          <Link 
            href="/jobs"
            className="px-6 py-3 rounded-xl font-semibold transition"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--lavender)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Смотреть вакансии
          </Link>
        </div>
      </div>
    </div>
  );
}
