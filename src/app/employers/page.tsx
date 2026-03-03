"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

export default function EmployersLandingPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t.employers.title}</h1>
          <p className="mt-3 max-w-2xl text-white/70 leading-relaxed">{t.employers.subtitle}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {t.employers.features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-white font-semibold">{f.title}</div>
                <p className="mt-2 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/auth?mode=signup&role=employer"
              className="h-11 px-6 inline-flex items-center justify-center rounded-2xl bg-[#7c3aed] font-semibold text-white hover:bg-[#6d28d9] transition"
            >
              {t.employers.registerBtn}
            </Link>
            <Link
              href="/auth?role=employer"
              className="h-11 px-6 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-semibold text-white/90 hover:bg-white/10 transition"
            >
              {t.employers.loginBtn}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
