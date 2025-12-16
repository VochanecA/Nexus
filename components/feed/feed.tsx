// components/feed/feed.tsx - KOMPLETAN ISPRAVLJEN KOD
"use client";

import { useState, useEffect } from "react";
import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Filter, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  views_count: number;
  user_has_liked: boolean;
  is_public?: boolean;
  impressions?: number;
  content_hash?: string;
  signature?: string;
  provenance?: any;
  image_width?: number;
  image_height?: number;
  image_aspect_ratio?: number;
  is_ad?: boolean;
}

interface FeedProps {
  initialPosts?: Post[];
  showTabs?: boolean;
  currentUserId?: string;
  variant?: 'default' | 'compact' | 'detailed';
  filter?: 'all' | 'following' | 'trending';
  showFollowButton?: boolean;
  onPostClick?: (postId: string) => void;
  // Dodajemo onFollowChange prop
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function Feed({ 
  initialPosts = [], 
  showTabs = true,
  currentUserId,
  variant = 'default',
  filter: initialFilter = 'all',
  showFollowButton = true,
  onPostClick,
  onFollowChange // Dodajemo novi prop
}: FeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(!initialPosts.length);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'following' | 'trending'>(initialFilter);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  const fetchPosts = async (refresh = false) => {
    try {
      setError(null);
      const start = refresh ? 0 : page * 10;
      
      let query = supabase
        .from("posts_with_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, start + 9);

      if (filter === 'following' && currentUserId) {
        const { data: following, error: followingError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);
        
        if (followingError) throw followingError;

        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in("user_id", followingIds);
        } else {
          setPosts([]);
          setHasMore(false);
          return;
        }
      }

      // Za trending filter - možete dodati logiku za popularne postove
      if (filter === 'trending') {
        query = query
          .order("likes_count", { ascending: false })
          .order("created_at", { ascending: false })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      if (refresh) {
        setPosts(data || []);
        setPage(0);
      } else {
        setPosts(prev => {
          // Sprečavamo duplikate
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = data?.filter(post => !existingIds.has(post.id)) || [];
          return [...prev, ...newPosts];
        });
        if (!refresh) {
          setPage(prev => prev + 1);
        }
      }

      setHasMore((data?.length || 0) >= 10);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!initialPosts.length) {
      fetchPosts();
    }
  }, []);

  useEffect(() => {
    if (initialPosts.length === 0) {
      setLoading(true);
      fetchPosts(true);
    }
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    fetchPosts(true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setLoadingMore(true);
      fetchPosts();
    }
  };

  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      // Ako je prosleđen custom handler, koristi ga
      onPostClick(postId);
    } else {
      // Inače koristi default navigaciju
      router.push(`/post/${postId}`);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'following' | 'trending');
    setPosts([]);
    setPage(0);
    setHasMore(true);
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    // Ako korisnik prestane da prati nekoga, možda želite da osvežite following feed
    if (filter === 'following' && !isFollowing) {
      // Filtriraj postove da uklonite one od korisnika koji se više ne prati
      setPosts(prev => prev.filter(post => post.user_id !== userId));
    }
    
    // Pozovi parent callback ako postoji
    if (onFollowChange) {
      onFollowChange(userId, isFollowing);
    }
  };

  // Ova funkcija će se proslijediti PostCard komponenti
  const handleFollowToggle = async (userId: string, currentlyFollowing: boolean) => {
    if (!currentUserId) return;
    
    try {
      if (currentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: userId,
          });
      }
      
      // Pozovi lokalnu handleFollowChange funkciju
      handleFollowChange(userId, !currentlyFollowing);
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Možete dodati toast notifikaciju ovdje
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-muted-foreground">Učitavanje objava...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="h-24 w-24 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Greška pri učitavanju</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Pokušaj ponovo
          </Button>
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="h-24 w-24 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Filter className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nema objava</h3>
          <p className="text-muted-foreground mb-6">
            {filter === 'following' 
              ? "Pratite nekoga da biste videli njihove objave ovde."
              : filter === 'trending'
              ? "Još nema popularnih objava u poslednjih 24 sata."
              : "Još nema objava. Budite prvi koji će objaviti nešto!"}
          </p>
          {filter === 'following' ? (
            <Button 
              onClick={() => router.push('/explore')}
              className="rounded-full"
            >
              Istraži korisnike
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/create')}
              className="rounded-full"
            >
              Napravi objavu
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs za filtere */}
      {showTabs && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-4 pb-2">
          <Tabs 
            defaultValue={filter} 
            onValueChange={handleFilterChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all" className="rounded-full">Sve</TabsTrigger>
              <TabsTrigger value="following" className="rounded-full">Pratim</TabsTrigger>
              <TabsTrigger value="trending" className="rounded-full">Trending</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  Prikazane sve objave
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Osveži
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="following" className="mt-0">
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  Objave od korisnika koje pratite
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Osveži
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="trending" className="mt-0">
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  Popularne objave u poslednjih 24 sata
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Osveži
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Lista postova */}
      <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-800">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            showFollowButton={showFollowButton}
            // Proslijeđujemo handleFollowToggle funkciju
            onFollowChange={handleFollowToggle}
            onPostClick={handlePostClick}
            variant={variant === 'compact' ? 'minimal' : 'default'}
            compact={variant === 'compact'}
            hideAdBadges={false}
          />
        ))}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="py-6 text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore || refreshing}
            className="rounded-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Učitavanje...
              </>
            ) : (
              'Učitaj još'
            )}
          </Button>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center border-t">
          <p className="text-muted-foreground">
            To su sve objave za sada!
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="rounded-full"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Osveži
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/create')}
              className="rounded-full"
            >
              Napravi objavu
            </Button>
          </div>
        </div>
      )}

      {/* Loading indicator za refresh */}
      {refreshing && (
        <div className="fixed top-20 right-4 z-50">
          <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg border">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Osvežavanje...</span>
          </div>
        </div>
      )}
    </div>
  );
}