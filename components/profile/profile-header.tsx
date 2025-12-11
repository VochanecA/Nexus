// components/profile/profile-header.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileFollowButton } from "@/components/profile/profile-follow-button"
import { createClient } from "@/lib/supabase/client"
import { Settings } from "lucide-react"

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
}

interface ProfileHeaderProps {
  profile: Profile
  isOwnProfile: boolean
  isFollowing: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  currentUserId?: string // Dodajte ovaj prop
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  followersCount: initialFollowersCount,
  followingCount,
  postsCount,
  currentUserId,
}: ProfileHeaderProps) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)

  const handleFollowChange = (newIsFollowing: boolean) => {
    setIsFollowing(newIsFollowing)
    // Ažurirajte broj pratilaca
    if (newIsFollowing) {
      setFollowersCount(prev => prev + 1)
    } else {
      setFollowersCount(prev => Math.max(0, prev - 1))
    }
    // Refresh stranicu za ažuriranje podataka
    router.refresh()
  }

  // Uzmi trenutnog korisnika ako nije prosleđen kao prop
  const getCurrentUserId = async (): Promise<string | undefined> => {
    if (currentUserId) return currentUserId
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  }

  return (
    <div className="border-b bg-card">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
            <AvatarFallback className="text-2xl">{profile.display_name[0].toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>


{isOwnProfile ? (
  <Button variant="outline" asChild className="gap-2">
    <Link href="/profile/edit">
      <Settings className="h-4 w-4" />
      Edit Profile
    </Link>
  </Button>
) : (
  <ProfileFollowButton
    profileId={profile.id}
    isFollowing={isFollowing}
    onFollowChange={handleFollowChange}
  />
)}
            </div>

            {profile.bio && <p className="mt-4 text-balance">{profile.bio}</p>}

            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{postsCount}</span> <span className="text-muted-foreground">posts</span>
              </div>
              <Link 
                href={`/profile/${profile.username}/followers`}
                className="hover:underline"
              >
                <span className="font-semibold">{followersCount}</span>{" "}
                <span className="text-muted-foreground">followers</span>
              </Link>
              <Link 
                href={`/profile/${profile.username}/following`}
                className="hover:underline"
              >
                <span className="font-semibold">{followingCount}</span>{" "}
                <span className="text-muted-foreground">following</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}