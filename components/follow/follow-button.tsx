// components/follow/follow-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface FollowButtonProps {
  followerId: string;
  followingId: string;
  isFollowing: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  followerId,
  followingId,
  isFollowing: initialIsFollowing,
  className = "",
  size = "sm",
  variant,
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleFollowToggle = async () => {
    if (!followerId || !followingId) return;
    
    setIsLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", followerId)
          .eq("following_id", followingId);
        
        if (error) throw error;
        
        setIsFollowing(false);
        toast.success("Unfollowed");
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: followerId,
            following_id: followingId,
          });
        
        if (error) {
          // Možda već postoji
          if (error.code === '23505') { // Unique violation
            setIsFollowing(true);
          } else {
            throw error;
          }
        } else {
          setIsFollowing(true);
        }
        toast.success("Following");
      }
      
      onFollowChange?.(!isFollowing);
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  // Odredite variant na osnovu isFollowing
  const buttonVariant = variant || (isFollowing ? "outline" : "default");

  return (
    <Button
      size={size}
      variant={buttonVariant}
      onClick={handleFollowToggle}
      disabled={isLoading || followerId === followingId}
      className={`gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Follow</span>
        </>
      )}
    </Button>
  );
}