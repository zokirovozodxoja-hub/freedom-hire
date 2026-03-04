"use client";

import { useEffect, useMemo, useState } from "react";
import { getMyProfile } from "@/lib/profile";
import { listMyExperiences, type Experience } from "@/lib/experiences";
import { listMySkills, type Skill, type SkillLevel } from "@/lib/skills";

/* ═══════════════════════════════════════════════════════════════════ */
/* HELPERS */
/* ═══════════════════════════════════════════════════════════════════ */

function formatMoney(n: number | null, currency: string) {
  if (!n) return "";
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${s} ${currency}`;
}

function totalExperienceMonths(items: Experience[]) {
  let months = 0;
  const now = new Date();
  const endFallback = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const e of items) {
    if (!e.start_date) continue;
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : endFallback;
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) months += diff;
  }
  return months;
}

function monthsToYM(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return { years, months };
}

function fmtDate(d: string | null) {
  if (!d) return "настоящее время";
  const date = new Date(d);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function calcDuration(s: string | null, e: string | null) {
  if (!s) return "";
  const sd = new Date(s), ed = e ? new Date(e) : new Date();
  const m = (ed.getFullYear() - sd.getFullYear()) * 12 + (ed.getMonth() - sd.getMonth());
  if (m <= 0) return "";
  const y = Math.floor(m / 12), mo = m % 12;
  return [y ? `${y} г.` : "", mo ? `${mo} мес.` : ""].filter(Boolean).join(" ");
}

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Начальный",
  junior: "Базовый", 
  intermediate: "Средний",
  advanced: "Продвинутый",
  expert: "Эксперт",
};

const STATUS_LABELS: Record<string, string> = {
  actively_looking: "Активно ищу работу",
  open_to_offers: "Рассматриваю предложения",
  starting_new_job: "Выхожу на новое место",
  not_looking: "Не ищу работу",
};

/* ═══════════════════════════════════════════════════════════════════ */
/* COMPONENT */
/* ═══════════════════════════════════════════════════════════════════ */

export default function ResumePrintPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    (async () => {
      const { profile, user } = await getMyProfile();
      if (!user) return;

      setProfile(profile);

      const ex = await listMyExperiences();
      setExperiences(ex.items ?? []);

      const sk = await listMySkills();
      setSkills(sk.items ?? []);

      setLoading(false);

      // Auto print
      setTimeout(() => window.print(), 400);
    })();
  }, []);

  const totalMonths = useMemo(() => totalExperienceMonths(experiences), [experiences]);
  const totalYM = useMemo(() => monthsToYM(totalMonths), [totalMonths]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        color: "#666"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12, fontSize: 24 }}>📄</div>
          <div>Подготовка PDF...</div>
        </div>
      </div>
    );
  }

  const salary = formatMoney(profile?.salary_expectation ?? null, profile?.salary_currency ?? "UZS");
  const initials = profile?.full_name 
    ? profile.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() 
    : "?";

  return (
    <>
      <div className="resume">
        {/* Header */}
        <header className="header">
          <div className="avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span className="initials">{initials}</span>
            )}
          </div>
          
          <div className="header-content">
            <h1 className="name">{profile?.full_name || "Имя не указано"}</h1>
            
            {profile?.headline && (
              <div className="headline">{profile.headline}</div>
            )}
            
            <div className="meta">
              {profile?.city && (
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.city}
                </span>
              )}
              
              {totalMonths > 0 && (
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Стаж: {totalYM.years > 0 && `${totalYM.years} г. `}{totalYM.months > 0 && `${totalYM.months} мес.`}
                </span>
              )}
              
              {salary && (
                <span className="meta-item salary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {salary}
                </span>
              )}
            </div>

            {profile?.job_search_status && (
              <div className="status">
                {STATUS_LABELS[profile.job_search_status] || profile.job_search_status}
              </div>
            )}
          </div>
        </header>

        {/* About */}
        {profile?.about && (
          <section className="section">
            <h2 className="section-title">
              <span className="section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              О себе
            </h2>
            <p className="about-text">{profile.about}</p>
          </section>
        )}

        {/* Experience */}
        <section className="section">
          <h2 className="section-title">
            <span className="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Опыт работы
          </h2>
          
          {experiences.length === 0 ? (
            <p className="empty">Опыт работы не указан</p>
          ) : (
            <div className="experience-list">
              {experiences.map((exp, idx) => {
                const duration = calcDuration(exp.start_date, exp.end_date);
                return (
                  <div key={exp.id} className={`experience-item ${idx < experiences.length - 1 ? 'has-line' : ''}`}>
                    <div className="exp-dot" />
                    <div className="exp-content">
                      <div className="exp-header">
                        <div>
                          <div className="exp-position">{exp.position || "Должность"}</div>
                          <div className="exp-company">{exp.company || "Компания"}</div>
                        </div>
                        <div className="exp-dates">
                          <div className="exp-period">{fmtDate(exp.start_date)} — {fmtDate(exp.end_date)}</div>
                          {duration && <div className="exp-duration">{duration}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Skills */}
        <section className="section">
          <h2 className="section-title">
            <span className="section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </span>
            Навыки
          </h2>
          
          {skills.length === 0 ? (
            <p className="empty">Навыки не указаны</p>
          ) : (
            <div className="skills-grid">
              {skills.map((skill) => (
                <div key={skill.id} className="skill-item">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-level">{LEVEL_LABELS[skill.level] || skill.level}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-brand">
            <span className="footer-logo">FH</span>
            <span>FreedomHIRE</span>
          </div>
          <div className="footer-url">freedomhire.uz</div>
        </footer>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #fff !important;
        }
        
        .resume {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #1a1a2e;
          background: #fff;
          max-width: 210mm;
          margin: 0 auto;
          padding: 0;
        }
        
        /* Header */
        .header {
          display: flex;
          gap: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid #5B2ECC;
          margin-bottom: 24px;
        }
        
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #5B2ECC, #7C4AE8);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .initials {
          font-size: 28px;
          font-weight: 700;
          color: #fff;
        }
        
        .header-content {
          flex: 1;
        }
        
        .name {
          font-size: 26px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        
        .headline {
          font-size: 15px;
          color: #5B2ECC;
          font-weight: 500;
          margin-bottom: 10px;
        }
        
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 10px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #555;
        }
        
        .meta-item svg {
          width: 14px;
          height: 14px;
          color: #888;
        }
        
        .meta-item.salary {
          color: #B8860B;
          font-weight: 600;
        }
        
        .meta-item.salary svg {
          color: #B8860B;
        }
        
        .status {
          display: inline-block;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #E8F5E9;
          color: #2E7D32;
          font-weight: 500;
        }
        
        /* Sections */
        .section {
          margin-bottom: 24px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #1a1a2e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .section-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #F3EAFF;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .section-icon svg {
          width: 14px;
          height: 14px;
          color: #5B2ECC;
        }
        
        .about-text {
          font-size: 13px;
          line-height: 1.6;
          color: #444;
        }
        
        .empty {
          font-size: 13px;
          color: #999;
          font-style: italic;
        }
        
        /* Experience */
        .experience-list {
          position: relative;
        }
        
        .experience-item {
          display: flex;
          gap: 12px;
          padding-bottom: 16px;
          position: relative;
        }
        
        .experience-item.has-line::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 16px;
          bottom: 0;
          width: 2px;
          background: #E0E0E0;
        }
        
        .exp-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #5B2ECC;
          flex-shrink: 0;
          margin-top: 4px;
          position: relative;
          z-index: 1;
        }
        
        .exp-content {
          flex: 1;
        }
        
        .exp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        
        .exp-position {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
        }
        
        .exp-company {
          font-size: 13px;
          color: #5B2ECC;
          margin-top: 2px;
        }
        
        .exp-dates {
          text-align: right;
          flex-shrink: 0;
        }
        
        .exp-period {
          font-size: 12px;
          color: #666;
        }
        
        .exp-duration {
          font-size: 11px;
          color: #999;
          margin-top: 2px;
        }
        
        /* Skills */
        .skills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .skill-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #F8F6FF;
          border: 1px solid #E8E0FF;
          border-radius: 20px;
          font-size: 12px;
        }
        
        .skill-name {
          color: #1a1a2e;
          font-weight: 500;
        }
        
        .skill-level {
          color: #888;
          font-size: 11px;
        }
        
        /* Footer */
        .footer {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #888;
        }
        
        .footer-logo {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: linear-gradient(135deg, #5B2ECC, #7C4AE8);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .footer-url {
          font-size: 12px;
          color: #5B2ECC;
        }
        
        /* Print specific */
        @media print {
          body {
            background: #fff !important;
          }
          
          .resume {
            padding: 0;
          }
          
          button, .no-print {
            display: none !important;
          }
        }
        
        /* Screen preview */
        @media screen {
          body {
            background: #f5f5f5;
            padding: 20px;
          }
          
          .resume {
            background: #fff;
            padding: 40px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            border-radius: 8px;
          }
        }
      `}</style>
    </>
  );
}
