"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

const FEATURE_ICONS = [
  <svg key="1" className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
  <svg key="2" className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="3" className="w-5 h-5" style={{ color: "var(--lavender)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>,
];

export default function EmployersLandingPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen text-white" style={{ background: "var(--ink)" }}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t.employers.title}</h1>
          <p className="mt-3 max-w-2xl text-white/70 leading-relaxed">{t.employers.subtitle}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {t.employers.features.map((f, idx) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" 
                  style={{ background: "rgba(92,46,204,0.2)", border: "1px solid rgba(92,46,204,0.3)" }}>
                  {FEATURE_ICONS[idx]}
                </div>
                <div className="text-white font-semibold">{f.title}</div>
                <p className="mt-2 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/auth?mode=signup&role=employer"
              className="btn-primary h-11 px-6 inline-flex items-center justify-center rounded-2xl font-semibold text-white transition"
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
