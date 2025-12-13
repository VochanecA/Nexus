import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PublicFeed from "@/components/feed/public-feed"

export default async function RootPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Ako je korisnik logovan, preusmjeri na /home
  if (user) {
    redirect("/home")
  }

  // Ako nije logovan, prikaži javni feed
  return <PublicFeed />
}