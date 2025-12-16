// components/feed/feed.tsx - ULTRA OPTIMIZOVANA VERZIJA
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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

// ============ CACHE SYSTEM ============
class FeedCache {
  private static instance: FeedCache;
  private cache = new Map<string, { data: Post[]; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 sekundi

  static getInstance(): FeedCache {
    if (!FeedCache.instance) {
      FeedCache.instance = new FeedCache();
    }
    return FeedCache.instance;
  }

  set(key: string, data: Post[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Auto cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, this.CACHE_TTL);
  }

  get(key: string): Post[] | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============ HELPER FUNCTIONS ============
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

const formatPostFromData = (post: any): Post => ({
  id: post.id,
  content: post.content,
  image_url: normalizeImageUrl(post.image_url),
  created_at: post.created_at,
  user_id: post.user_id,
  username: post.profiles?.username || 'user',
  display_name: post.profiles?.display_name || 'User',
  avatar_url: post.profiles?.avatar_url || null,
  likes_count: 0,
  comments_count: 0,
  user_has_liked: false,
});

// ============ MAIN COMPONENT ============
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
  const [refreshing, setRefreshing] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const cache = FeedCache.getInstance();

  // ============ OPTIMIZED FETCH POSTS ============
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchStartTime = performance.now();
    
    if (!refreshing && !forceRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      // Cache key based on props
      const cacheKey = `feed_${userId || 'anon'}_${followingUserIds.join(',')}_${isAuthenticated}`;
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached) {
          console.log("📦 Using cached posts");
          setPosts(cached);
          return;
        }
      }

      const supabase = createClient();
      
      // Build query
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `);

      // Apply following filter if needed
      if (isAuthenticated && followingUserIds.length > 0) {
        query = query.in('user_id', followingUserIds);
      }

      // Execute query
      const { data: postsWithProfiles, error: fetchError } = await query
        .order("created_at", { ascending: false })
        .limit(50)
        .abortSignal(controller.signal);

      if (controller.signal.aborted) return;
      
      if (fetchError) throw fetchError;

      // Format posts
      const formattedPosts = (postsWithProfiles || []).map(formatPostFromData);

      // Cache results
      cache.set(cacheKey, formattedPosts);

      // Performance logging
      const fetchTime = performance.now() - fetchStartTime;
      console.log(`✅ Loaded ${formattedPosts.length} posts in ${fetchTime.toFixed(0)}ms`);

      setPosts(formattedPosts);

    } catch (err) {
      if (controller.signal.aborted) return;
      
      console.error("❌ Error in fetchPosts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      
      // Try cache fallback
      const cacheKey = `feed_${userId || 'anon'}_${followingUserIds.join(',')}_${isAuthenticated}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        setPosts(cached);
        setError(null);
      }
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isAuthenticated, followingUserIds, userId, refreshing]);

  // ============ EFFECTS ============
  useEffect(() => {
    isMountedRef.current = true;
    fetchPosts();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPosts]);

  // ============ EVENT HANDLERS ============
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(true);
  }, [fetchPosts]);

  const handleFollowChangeWrapper = useCallback((userId: string, isFollowing: boolean) => {
    onFollowChange?.(userId, isFollowing);
  }, [onFollowChange]);

  // ============ MEMOIZED COMPONENTS ============
  const LoadingState = useMemo(() => (
    <div className="p-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading posts...</p>
    </div>
  ), []);

  const ErrorState = useMemo(() => (
    <div className="p-8 text-center">
      <div className="text-destructive mb-2">Error loading posts</div>
      <p className="text-muted-foreground text-sm mb-4">{error}</p>
      <Button onClick={handleRefresh} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  ), [error, handleRefresh]);

  const EmptyState = useMemo(() => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground mb-2">
        {isAuthenticated && followingUserIds.length === 0 
          ? "Follow some people to see their posts!" 
          : "No posts yet"}
      </p>
      <Button onClick={handleRefresh} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  ), [isAuthenticated, followingUserIds.length, handleRefresh]);

  // ============ RENDER ============
  if (loading && !refreshing) {
    return LoadingState;
  }

  if (error) {
    return ErrorState;
  }

  if (posts.length === 0) {
    return EmptyState;
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleRefresh}
          variant="ghost" 
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id}
            post={post}
            showFollowButton={showFollowButton && isAuthenticated}
            currentUserId={userId}
            isCurrentUserFollowing={followingUserIds.includes(post.user_id)}
            onFollowChange={handleFollowChangeWrapper}
          />
        ))}
      </div>

      {/* Load More Indicator */}
      {posts.length >= 50 && (
        <div className="text-center py-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load more posts'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}