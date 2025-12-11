// hooks/useCachedFeed.ts
import { useState, useEffect, useCallback } from 'react';
import { Post } from '@/types';
import { getCachedPosts, setCachedPosts } from '@/lib/redis/cache';
import { createClient } from '@/lib/supabase/client';

export function useCachedFeed(algorithm: string, userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Proveri da li postoje keširani postovi (osim ako se ne forsira osvežavanje)
      if (!forceRefresh) {
        const cachedPosts = await getCachedPosts(algorithm);
        
        if (cachedPosts) {
          setPosts(cachedPosts);
          setLoading(false);
          return;
        }
      }
      
      // Ako nema keširanih postova ili se forsira osvežavanje, dohvati iz baze
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles: user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Dodaj filtere na osnovu tipa feed-a
      if (algorithm === 'following' && userId) {
        // Dohvati postove od korisnika koje prati trenutni korisnik
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
          
        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          query = query.in('user_id', followingIds);
        } else {
          // Ako ne prati nikoga, vrati prazan rezultat
          setPosts([]);
          setLoading(false);
          return;
        }
      }
      
      const { data, error } = await query;
        
      if (error) throw error;
      
      // Sačuvaj u keš
      if (data) {
        await setCachedPosts(algorithm, data);
        setPosts(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [algorithm, supabase, userId]);
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  // Funkcija za osvežavanje feed-a
  const refreshFeed = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);
  
  return { posts, loading, error, refreshFeed };
}