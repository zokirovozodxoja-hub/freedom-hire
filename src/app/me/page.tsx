"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MeRedirect() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = profile?.role ?? "candidate";
      if (role === "employer") router.replace("/employer");
      else router.replace("/resume");
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
      <div className="text-white/50 text-sm">Перенаправляем...</div>
    </div>
  );
}
