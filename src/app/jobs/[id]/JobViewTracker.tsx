"use client";

import { useEffect } from "react";
import { trackJobView } from "@/lib/analytics";

export default function JobViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    // Трекаем просмотр с небольшой задержкой (чтобы не считать случайные клики)
    const timer = setTimeout(() => {
      trackJobView(jobId).catch(console.error);
    }, 2000); // 2 секунды на странице = засчитываем просмотр

    return () => clearTimeout(timer);
  }, [jobId]);

  return null; // Невидимый компонент
}
