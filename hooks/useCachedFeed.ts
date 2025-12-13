// hooks/useCachedFeed.ts
import { useState, useEffect, useCallback } from 'react';
import { Post } from '@/types';
import { getCachedPosts, setCachedPosts } from '@/lib/cache'; // Sada koristi lokalni cache
import { createClient } from '@/lib/supabase/client';

export function useCachedFeed(algorithm: string, userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Proveri cache samo ako ne forsira refresh
      if (!forceRefresh) {
        const cachedPosts = await getCachedPosts(algorithm);
        if (cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts as Post[]);
          setLoading(false);
          return;
        }
      }
      
      // Fetch iz baze
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (algorithm === 'following' && userId) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
          
        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in('user_id', followingIds);
        } else {
          setPosts([]);
          setLoading(false);
          return;
        }
      }
      
      const { data, error: queryError } = await query;
        
      if (queryError) throw queryError;
      
      // Sačuvaj u cache
      if (data) {
        await setCachedPosts(algorithm, data);
        setPosts(data);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [algorithm, supabase, userId]);
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  const refreshFeed = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);
  
  useEffect(() => {
    const handleRefresh = () => {
      refreshFeed();
    };
    
    window.addEventListener('feedRefresh', handleRefresh);
    return () => window.removeEventListener('feedRefresh', handleRefresh);
  }, [refreshFeed]);
  
  return { posts, loading, error, refreshFeed };
}