"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);

  return <div>Profile</div>;
}