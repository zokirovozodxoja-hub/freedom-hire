"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/resume");
  }, [router]);
  return null;
}