// app/profile/[username]/page.tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileTabs } from "@/components/profile/profile-tabs"

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // Get the profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle()

  if (!profile) {
    notFound()
  }

  // Get current user to check if this is their profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwnProfile = user?.id === profile.id

  // Get follower and following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id)

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id)

  // Check if current user follows this profile
  let isFollowing = false
  if (user && !isOwnProfile) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle()
    isFollowing = !!data
  }

  // Get posts count
  const { count: postsCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)

  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader
        profile={profile}
        currentUserId={user?.id} // Dodajte ovo
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followersCount={followersCount ?? 0}
        followingCount={followingCount ?? 0}
        postsCount={postsCount ?? 0}
      />
      <ProfileTabs userId={profile.id} username={username} />
    </div>
  )
}