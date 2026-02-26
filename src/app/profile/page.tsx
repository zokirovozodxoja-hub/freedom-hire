"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true)

      const file = event.target.files?.[0]
      if (!file) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const filePath = `${user.id}/avatar.png`

      const { error } = await supabase.storage
        .from("AVATARS")
        .upload(filePath, file, { upsert: true })

      if (error) throw error

      alert("Аватар загружен 🚀")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Профиль</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={loading}
      />
    </div>
  )
}