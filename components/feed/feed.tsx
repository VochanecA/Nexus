// components/feed/feed.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

interface FeedProps {
  userId?: string;
  followingUserIds?: string[];
  isAuthenticated?: boolean;
  showFollowButton?: boolean;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function Feed({ 
  userId, 
  followingUserIds, 
  isAuthenticated = false,
  showFollowButton = false,
  onFollowChange
}: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [otherPosts, setOtherPosts] = useState<Post[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [currentFollowingIds, setCurrentFollowingIds] = useState<string[]>(followingUserIds || []);

  useEffect(() => {
    if (followingUserIds) {
      setCurrentFollowingIds(followingUserIds);
    }
  }, [followingUserIds]);

  useEffect(() => {
    void fetchPosts();
  }, [userId, followingUserIds, isAuthenticated]);

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      // Dodaj u listu pratilaca
      setCurrentFollowingIds(prev => [...prev, userId]);
    } else {
      // Ukloni iz liste pratilaca
      setCurrentFollowingIds(prev => prev.filter(id => id !== userId));
    }

    // Pozovi callback ako postoji
    onFollowChange?.(userId, isFollowing);
  };

  async function fetchPosts() {
    const supabase = createClient();
    setLoading(true);
    setError(null);

    try {
      // Prvo dohvati sve postove
      const { data: allPosts, error: fetchError } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey(username, display_name, avatar_url)
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error("[v0] Error fetching posts:", fetchError);
        if (fetchError.message?.includes("Could not find the table")) {
          setError("database_not_setup");
        } else {
          setError(fetchError.message);
        }
        setLoading(false);
        return;
      }

      if (!allPosts || allPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Formatiraj sve postove
      const formattedAllPosts = await Promise.all(
        allPosts.map(async (post) => {
          const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          const { count: commentsCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          let userHasLiked = false;
          if (userId) {
            const { data: like } = await supabase
              .from("likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", userId)
              .maybeSingle();
            userHasLiked = !!like;
          }

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user_id: post.user_id,
            username: post.profiles.username,
            display_name: post.profiles.display_name,
            avatar_url: post.profiles.avatar_url,
            likes_count: likesCount ?? 0,
            comments_count: commentsCount ?? 0,
            user_has_liked: userHasLiked,
          };
        })
      );

      // Ako je korisnik logovan i ima pratilaca
      if (isAuthenticated && currentFollowingIds && currentFollowingIds.length > 0) {
        const following = formattedAllPosts.filter((post) =>
          currentFollowingIds.includes(post.user_id)
        );
        const other = formattedAllPosts.filter(
          (post) => !currentFollowingIds.includes(post.user_id)
        );

        setFollowingPosts(following);
        setOtherPosts(other);
        
        // Prvo prikaži postove od pratilaca
        if (following.length > 0) {
          setPosts(following);
        } else {
          setPosts(other);
          setShowAll(true);
        }
      } else {
        // Ako nije logovan ili nema pratilaca, prikaži sve
        setPosts(formattedAllPosts);
        setFollowingPosts([]);
        setOtherPosts(formattedAllPosts);
        setShowAll(true);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handleShowAll = () => {
    if (followingPosts.length > 0 && otherPosts.length > 0) {
      setPosts([...followingPosts, ...otherPosts]);
      setShowAll(true);
    }
  };

  const handleShowFollowing = () => {
    if (followingPosts.length > 0) {
      setPosts(followingPosts);
      setShowAll(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Loading feed...</p>
      </div>
    );
  }

  if (error === "database_not_setup") {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-2">Database not set up</p>
        <p className="text-muted-foreground text-sm">
          Run the SQL scripts to create the necessary tables
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-2">Error loading feed</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={fetchPosts} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-2">No posts yet</p>
        <p className="text-muted-foreground text-sm">
          {isAuthenticated
            ? "Be the first to share something or follow some users!"
            : "Be the first to share something!"}
        </p>
        {isAuthenticated && (
          <Button onClick={fetchPosts} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filter dugmad - samo ako ima pratilaca */}
      {isAuthenticated && followingPosts.length > 0 && otherPosts.length > 0 && (
        <div className="sticky top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={showAll ? "outline" : "default"}
              size="sm"
              onClick={handleShowFollowing}
              className="text-xs"
            >
              Following ({followingPosts.length})
            </Button>
            <Button
              variant={showAll ? "default" : "outline"}
              size="sm"
              onClick={handleShowAll}
              className="text-xs"
            >
              All Posts ({followingPosts.length + otherPosts.length})
            </Button>
          </div>
        </div>
      )}

      {/* Poruka ako prikazujemo samo pratilce */}
      {isAuthenticated && !showAll && followingPosts.length === 0 && (
        <div className="p-4 text-center border-b">
          <p className="text-muted-foreground text-sm">
            No posts from users you follow.{" "}
            <button
              onClick={handleShowAll}
              className="text-primary hover:underline"
            >
              Show all posts
            </button>
          </p>
        </div>
      )}

      {/* Postovi */}
      <div className="divide-y">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            showFollowButton={showFollowButton && isAuthenticated}
            currentUserId={userId}
            isCurrentUserFollowing={currentFollowingIds.includes(post.user_id)}
            onFollowChange={handleFollowChange}
          />
        ))}
      </div>

      {/* Poruka ako ima više postova */}
      {isAuthenticated && !showAll && otherPosts.length > 0 && (
        <div className="p-4 text-center border-t">
          <p className="text-muted-foreground text-sm">
            Showing {followingPosts.length} posts from users you follow.{" "}
            <button
              onClick={handleShowAll}
              className="text-primary hover:underline"
            >
              Show {otherPosts.length} more posts
            </button>
          </p>
        </div>
      )}
    </div>
  );
}