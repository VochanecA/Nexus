// components/post/likes-list.tsx
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Like {
  id: string;
  user_id: string;
  created_at: string;
  profiles: User | null; // Ovo je važno - može biti null ili User objekat
}

interface LikesListProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LikesList({ postId, open, onOpenChange }: LikesListProps) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      fetchLikes();
    }
  }, [open, postId]);

  const fetchLikes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("likes")
        .select(`
          id,
          user_id,
          created_at,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Supabase vraća profiles kao objekat, ali trebamo osigurati tip
      const formattedLikes = (data || []).map((like: any) => {
        // Ovdje uzimamo prvi element ako je array, inače objekat
        const profiles = Array.isArray(like.profiles) 
          ? (like.profiles[0] || null)
          : (like.profiles || null);

        return {
          id: like.id,
          user_id: like.user_id,
          created_at: like.created_at,
          profiles: profiles
        };
      }).filter(like => like.profiles !== null); // Filtriraj prazne profile

      setLikes(formattedLikes);
    } catch (err) {
      console.error("Error fetching likes:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            Liked by {likes.length} {likes.length === 1 ? "person" : "people"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading likes...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive">Error loading likes</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button
                variant="outline"
                onClick={fetchLikes}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : likes.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No likes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to like this post
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {likes.map((like) => (
                  <div
                    key={like.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={like.profiles?.avatar_url || undefined}
                        alt={like.profiles?.display_name || "User"}
                      />
                      <AvatarFallback>
                        {getInitials(like.profiles?.display_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium truncate">
                            {like.profiles?.display_name || "Unknown User"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{like.profiles?.username || "unknown"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(like.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}