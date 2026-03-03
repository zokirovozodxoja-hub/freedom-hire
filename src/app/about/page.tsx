"use client";
import { useI18n } from "@/i18n/context";

export default function AboutPage() {
 const { t } = useI18n();
 return (
 <main className="min-h-screen bg-[#0b1220] text-white p-6">
 <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
 <h1 className="text-3xl font-bold">{t.about.title}</h1>
 <p className="text-white/70 mt-3 leading-relaxed">{t.about.description}</p>
 </div>
 </main>
 );
}
