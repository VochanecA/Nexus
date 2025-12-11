import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/layout/navigation"

export default async function PostLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()

  return (
    <div className="flex min-h-screen">
      <Navigation username={profile?.username} />
      <main className="ml-64 flex-1">{children}</main>
    </div>
  )
}
