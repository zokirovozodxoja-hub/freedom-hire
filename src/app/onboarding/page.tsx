"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();

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
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
      <div className="text-white/50 text-sm">Определяем ваш профиль...</div>
    </div>
  );
}
