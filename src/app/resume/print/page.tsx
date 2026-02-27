"use client";

import { useEffect, useMemo, useState } from "react";
import { getMyProfile, type Profile } from "@/lib/profile";
import { listMyExperiences, type Experience } from "@/lib/experiences";
import { listMySkills, type Skill } from "@/lib/skills";

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

    const diff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    if (diff > 0) months += diff;
  }

  return months;
}

function monthsToYM(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return { years, months };
}

export default function ResumePrintPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    (async () => {
      const { profile, user } = await getMyProfile();
      if (!user) return;

      setProfile(profile);

      const ex = await listMyExperiences();
      setExperiences(ex.items);

      const sk = await listMySkills();
      setSkills(sk.items ?? []);

      setLoading(false);

      // печатаем автоматически
      setTimeout(() => window.print(), 250);
    })();
  }, []);

  const totalMonths = useMemo(() => totalExperienceMonths(experiences), [experiences]);
  const totalYM = useMemo(() => monthsToYM(totalMonths), [totalMonths]);

  if (loading) return <div style={{ padding: 24 }}>Готовлю PDF...</div>;

  const salary = formatMoney(profile?.salary_expectation ?? null, profile?.salary_currency ?? "UZS");

  return (
    <div className="print-root">
      <div className="header">
        <div className="avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="avatar" /> : null}
        </div>

        <div className="htext">
          <div className="name">{profile?.full_name ?? ""}</div>
          <div className="sub">
            {(profile?.headline ?? "") + (profile?.city ? ` · ${profile.city}` : "")}
          </div>
          <div className="sub small">
            Общий стаж: {totalYM.years} г {totalYM.months} мес
          </div>
          {salary ? <div className="sub small">Желаемая зарплата: {salary}</div> : null}
        </div>
      </div>

      {profile?.about ? (
        <section>
          <h2>О себе</h2>
          <p>{profile.about}</p>
        </section>
      ) : null}

      <section>
        <h2>Опыт работы</h2>
        {experiences.length === 0 ? (
          <p className="muted">Не указан</p>
        ) : (
          <div className="list">
            {experiences.map((e) => (
              <div key={e.id} className="item">
                <div className="row">
                  <div className="title">
                    <b>{e.company ?? ""}</b> — {e.position ?? ""}
                  </div>
                  <div className="dates">
                    {e.start_date ?? ""} — {e.end_date ?? "по н.в."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Навыки</h2>
        {skills.length === 0 ? (
          <p className="muted">Не указаны</p>
        ) : (
          <div className="chips">
            {skills.map((s) => (
              <span key={s.id} className="chip">
                {s.name} <span className="lvl">({s.level})</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #fff !important;
        }
        .print-root {
          font-family: Arial, sans-serif;
          color: #111;
          background: #fff;
        }
        .header {
          display: flex;
          gap: 14px;
          align-items: center;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #ddd;
          background: #f3f3f3;
          flex: 0 0 auto;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .sub {
          color: #444;
          font-size: 13px;
          line-height: 1.35;
        }
        .sub.small {
          font-size: 12px;
          color: #555;
        }
        section {
          margin-top: 14px;
        }
        h2 {
          font-size: 14px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .muted {
          color: #666;
        }
        .list .item {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .title {
          font-size: 13px;
        }
        .dates {
          font-size: 12px;
          color: #555;
          white-space: nowrap;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          border: 1px solid #ddd;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          background: #fafafa;
        }
        .lvl {
          color: #666;
        }

        /* скрываем все кнопки и элементы UI если вдруг попадут */
        button,
        .no-print {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
