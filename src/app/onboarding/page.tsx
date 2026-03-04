"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/context";

export default function OnboardingPage() {
 const router = useRouter();
 const { t } = useI18n();

 useEffect(() => {
 (async () => {
 const supabase = createClient();
 const { data } = await supabase.auth.getUser();

 if (!data.user) {
 router.replace("/auth");
 return;
 }

 const { data: profile } = await supabase
 .from("profiles")
 .select("role, is_onboarded")
 .eq("id", data.user.id)
 .maybeSingle();

 const role = profile?.role ?? data.user.user_metadata?.role ?? "candidate";

 if (role === "employer") {
 router.replace("/onboarding/employer");
 } else {
 router.replace("/onboarding/candidate");
 }
 })();
 }, [router]);

 return (
 <div className="min-h-screen text-white flex items-center justify-center" style={{ background: "var(--ink)" }}>
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 rounded-full border-2 animate-spin"
 style={{ borderColor: "rgba(196,173,255,0.2)", borderTopColor: "var(--lavender)" }} />
 <div className="text-sm font-body" style={{ color: "rgba(255,255,255,0.5)" }}>{t.onboarding.detectingProfile}</div>
 </div>
 </div>
 );
}
