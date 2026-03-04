"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

const TEAM = [
  { name: "Зокиров Озод", role: "CEO & Co-founder", initials: "ЗО" },
  { name: "Команда разработки", role: "Engineering",      initials: "КР" },
  { name: "Команда продукта",   role: "Product & Design", initials: "КП" },
];

const STATS = [
  { label: "Вакансий размещено",  value: "500+",  icon: "briefcase" },
  { label: "Компаний на платформе", value: "120+", icon: "building"  },
  { label: "Соискателей",         value: "2 000+", icon: "people"    },
  { label: "Успешных наймов",     value: "300+",  icon: "check"     },
];

const VALUES = [
  { icon: "speed",   title: "Скорость",     desc: "Разместить вакансию или отправить отклик — дело 2 минут. Мы убрали всё лишнее." },
  { icon: "local",   title: "Локальность",  desc: "Фокус на рынке Узбекистана. Все вакансии и кандидаты — отсюда." },
  { icon: "open",    title: "Прозрачность", desc: "Видны зарплаты, статусы откликов и причины решений — без чёрных ящиков." },
  { icon: "simple",  title: "Простота",     desc: "Никаких подписок и скрытых платежей. Зарегистрируйся и начни сразу." },
];

function Icon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  const s = { color: "var(--lavender)" };
  switch (type) {
    case "briefcase": return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
    case "building":  return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>;
    case "people":    return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
    case "check":     return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    case "speed":     return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
    case "local":     return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
    case "open":      return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>;
    case "simple":    return <svg className={cls} style={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>;
    default:          return null;
  }
}

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* ── HERO ── */}
        <div className="brand-card rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          style={{ border: "1px solid rgba(196,173,255,0.12)" }}>
          {/* bg glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(92,46,204,0.15) 0%, transparent 70%)" }} />

          <div className="relative">
            <div className="font-accent text-xs mb-3" style={{ color: "var(--lavender)" }}>О ПРОЕКТЕ</div>
            <h1 className="font-display text-4xl sm:text-5xl mb-4" style={{ color: "var(--chalk)" }}>
              Freedom<span style={{ color: "var(--lavender)" }}>HIRE</span>
            </h1>
            <p className="font-body text-lg leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.6)" }}>
              Платформа для поиска работы и найма в Узбекистане. Соискатели находят
              подходящие вакансии, а компании быстро закрывают открытые позиции —
              без лишних шагов и скрытых платежей.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/jobs"
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                Смотреть вакансии
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </Link>
              <Link href="/employers"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.04)" }}>
                Разместить вакансию
              </Link>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="brand-card rounded-2xl p-5 text-center"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.2)" }}>
                <Icon type={s.icon} />
              </div>
              <div className="font-display text-2xl font-bold mb-1" style={{ color: "var(--chalk)" }}>{s.value}</div>
              <div className="font-body text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── MISSION ── */}
        <div className="brand-card rounded-2xl p-7" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
          <div className="font-accent text-xs mb-3" style={{ color: "var(--lavender)" }}>МИССИЯ</div>
          <h2 className="font-display text-2xl mb-3" style={{ color: "var(--chalk)" }}>Почему мы это делаем</h2>
          <p className="font-body leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Рынок труда в Узбекистане активно растёт, но инструменты найма отставали.
            Мы создали FreedomHIRE чтобы работодатели могли находить людей быстро,
            а соискатели — понимать статус своего отклика и получать честную обратную связь.
          </p>
        </div>

        {/* ── VALUES ── */}
        <div>
          <div className="font-accent text-xs mb-4" style={{ color: "var(--lavender)" }}>ЦЕННОСТИ</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {VALUES.map(v => (
              <div key={v.title} className="brand-card rounded-2xl p-5 flex gap-4"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(92,46,204,0.15)", border: "1px solid rgba(92,46,204,0.2)" }}>
                  <Icon type={v.icon} />
                </div>
                <div>
                  <div className="font-semibold font-body mb-1" style={{ color: "var(--chalk)" }}>{v.title}</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTACTS ── */}
        <div className="brand-card rounded-2xl p-7" style={{ border: "1px solid rgba(196,173,255,0.1)" }}>
          <div className="font-accent text-xs mb-3" style={{ color: "var(--lavender)" }}>КОНТАКТЫ</div>
          <h2 className="font-display text-xl mb-4" style={{ color: "var(--chalk)" }}>Свяжитесь с нами</h2>
          <div className="space-y-3">
            {[
              { icon: "email", label: "Email поддержки", value: "support@freedomhire.uz" },
              { icon: "web",   label: "Сайт",            value: "freedomhire.uz"          },
              { icon: "geo",   label: "Город",           value: "Ташкент, Узбекистан"     },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {row.icon === "email" && <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                  {row.icon === "web"   && <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>}
                  {row.icon === "geo"   && <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
                </div>
                <div>
                  <div className="font-accent text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{row.label}</div>
                  <div className="font-body text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
