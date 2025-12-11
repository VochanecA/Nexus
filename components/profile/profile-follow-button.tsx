// components/profile/profile-follow-button.tsx
"use client";

import { useEffect, useState } from "react";
import { FollowButton } from "@/components/follow/follow-button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ProfileFollowButtonProps {
  profileId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export function ProfileFollowButton({
  profileId,
  isFollowing,
  onFollowChange,
  className,
}: ProfileFollowButtonProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error fetching current user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowChange = (newIsFollowing: boolean) => {
    // Ako nema korisnika, redirect na login
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    
    onFollowChange?.(newIsFollowing);
  };

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Loading...
      </button>
    );
  }

  if (!currentUserId) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Follow
      </button>
    );
  }

  return (
    <FollowButton
      followerId={currentUserId}
      followingId={profileId}
      isFollowing={isFollowing}
      onFollowChange={handleFollowChange}
      size="default"
      className={className}
    />
  );
}