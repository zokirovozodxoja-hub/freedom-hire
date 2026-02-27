"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  return <div>Profile</div>;
}