// components/feed/feed.tsx - FINALNA ISPRAVLJENA VERZIJA
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
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

// Helper function from public-feed.tsx
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

export function Feed({ 
  userId, 
  followingUserIds = [], 
  isAuthenticated = false,
  showFollowButton = false,
  onFollowChange
}: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Fetching posts WITH PROPER QUERY...");
      
      // ✅ KORISTI POTPUNO ISTI QUERY KAO U PUBLIC-FEED.TSX
      const { data: postsWithProfiles, error: fetchError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      console.log("📊 Query results:", postsWithProfiles?.length || 0, "posts");
      
      if (fetchError) {
        console.error("❌ Query error:", fetchError);
        throw fetchError;
      }

      if (!postsWithProfiles || postsWithProfiles.length === 0) {
        console.log("ℹ️ No posts found");
        setPosts([]);
        return;
      }

      // ✅ DEBUG: Prikaži detalje prvog posta
      const firstPost = postsWithProfiles[0];
      console.log("🔍 FIRST POST DETAILS:", {
        id: firstPost.id,
        content: firstPost.content.substring(0, 50),
        image_url: firstPost.image_url,
        type: typeof firstPost.image_url,
        hasImageUrl: !!firstPost.image_url,
        profile: firstPost.profiles
      });

      // ✅ Formatiraj postove - KORISTI NORMALIZE FUNKCIJU
      const formattedPosts: Post[] = postsWithProfiles.map((post: any) => {
        // Normalizuj image_url
        const normalizedImageUrl = normalizeImageUrl(post.image_url);
        
        console.log(`📝 Processing ${post.id}:`, {
          dbImageUrl: post.image_url,
          normalized: normalizedImageUrl,
          profileExists: !!post.profiles
        });

        return {
          id: post.id,
          content: post.content,
          image_url: normalizedImageUrl, // OVO JE SADA ISPRAVNO
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.profiles?.username || 'user',
          display_name: post.profiles?.display_name || 'User',
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        };
      });

      console.log("✅ FINAL POSTS SUMMARY:", {
        total: formattedPosts.length,
        withImages: formattedPosts.filter(p => p.image_url !== null).length,
        firstPostImage: formattedPosts[0]?.image_url
      });
      
      // Filter za following ako je potrebno
      if (isAuthenticated && followingUserIds.length > 0) {
        const filtered = formattedPosts.filter(p => 
          followingUserIds.includes(p.user_id)
        );
        console.log("🔍 Filtered to following:", filtered.length, "posts");
        setPosts(filtered);
      } else {
        setPosts(formattedPosts);
      }

    } catch (err) {
      console.error("❌ Error in fetchPosts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, followingUserIds]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleFollowChangeWrapper = (userId: string, isFollowing: boolean) => {
    onFollowChange?.(userId, isFollowing);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-2">Error loading posts</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={fetchPosts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No posts yet</p>
        <Button onClick={fetchPosts} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  console.log("🎨 Rendering", posts.length, "posts with images");

  return (
    <div className="divide-y">
      {posts.map((post) => {
        console.log(`➡️ Rendering PostCard ${post.id}:`, {
          hasImage: !!post.image_url,
          imageUrl: post.image_url
        });
        
        return (
          <PostCard 
            key={post.id} 
            post={post}
            showFollowButton={showFollowButton && isAuthenticated}
            currentUserId={userId}
            isCurrentUserFollowing={followingUserIds.includes(post.user_id)}
            onFollowChange={handleFollowChangeWrapper}
          />
        );
      })}
    </div>
  );
}