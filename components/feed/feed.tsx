// components/feed/feed.tsx - ISPRAVLJENA VERZIJA
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Post {
  id: string;
  content: string;
  image_url: string | null; // Promijenjeno: mora biti string | null
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
  followingUserIds = [], 
  isAuthenticated = false,
  showFollowButton = false,
  onFollowChange
}: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [userId, followingUserIds, isAuthenticated]);

  const fetchPosts = async () => {
    const supabase = createClient();
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching posts from Supabase...");
      
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id, 
          content, 
          image_url,
          created_at, 
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      console.log("Raw posts from DB:", postsData);

      if (postsError) {
        console.error("Posts error:", postsError);
        throw postsError;
      }

      if (!postsData || postsData.length === 0) {
        console.log("No posts found");
        setPosts([]);
        return;
      }

      console.log("Processing", postsData.length, "posts");

      // Dohvati profile
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      console.log("Fetching profiles for user IDs:", userIds);
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      console.log("Profiles found:", profilesData);

      // Kreiraj mapu profila
      const profileMap = new Map();
      profilesData?.forEach(p => profileMap.set(p.id, p));

      // Formiraj finalne postove - OVO JE KLJUČNO
      const formattedPosts: Post[] = postsData.map(post => {
        const profile = profileMap.get(post.user_id);
        
        // ISPRAVKA: Konvertiraj undefined u null
        const imageUrl = post.image_url === undefined ? null : post.image_url;
        
        const formattedPost: Post = {
          id: post.id,
          content: post.content,
          image_url: imageUrl, // OVO JE ISPRAVLJENO
          created_at: post.created_at,
          user_id: post.user_id,
          username: profile?.username || 'user',
          display_name: profile?.display_name || 'User',
          avatar_url: profile?.avatar_url || null,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        };

        console.log(`Post ${post.id}:`, {
          originalImageUrl: post.image_url,
          formattedImageUrl: formattedPost.image_url,
          type: typeof formattedPost.image_url
        });

        return formattedPost;
      });

      console.log("FINAL formatted posts:", formattedPosts);
      
      // Filter za following ako je potrebno
      if (isAuthenticated && followingUserIds.length > 0) {
        const filtered = formattedPosts.filter(p => 
          followingUserIds.includes(p.user_id)
        );
        console.log("Filtered to following:", filtered.length, "posts");
        setPosts(filtered);
      } else {
        setPosts(formattedPosts);
      }

    } catch (err) {
      console.error("Error in fetchPosts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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

  console.log("Rendering", posts.length, "posts");

  return (
    <div className="divide-y">
      {posts.map((post) => {
        console.log("Rendering PostCard for post:", {
          id: post.id,
          image_url: post.image_url,
          hasImage: !!post.image_url
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