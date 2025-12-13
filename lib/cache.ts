// lib/cache.ts (novi fajl)
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio?: string | null;
  };
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

interface CachedPosts {
  posts: Post[];
  timestamp: number;
  algorithm: string;
}

const CACHE_TTL = 60; // 60 seconds

export async function getCachedPosts(algorithm: string): Promise<Post[] | null> {
  // Radi samo u browser-u
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(`posts:${algorithm}`);
    if (cached) {
      const parsedData: CachedPosts = JSON.parse(cached);
      
      // Proveri da li je cache istekao
      if (Date.now() - parsedData.timestamp < CACHE_TTL * 1000) {
        return parsedData.posts;
      } else {
        // Obriši istekli cache
        localStorage.removeItem(`posts:${algorithm}`);
      }
    }
  } catch (error) {
    console.error('Cache error:', error);
  }
  return null;
}

export async function setCachedPosts(algorithm: string, posts: Post[]): Promise<void> {
  // Radi samo u browser-u
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData: CachedPosts = {
      posts,
      timestamp: Date.now(),
      algorithm
    };
    localStorage.setItem(`posts:${algorithm}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function invalidateCache(algorithm: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(`posts:${algorithm}`);
  } catch (error) {
    console.error('Cache deletion error:', error);
  }
}

export async function clearAllCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Obriši sve cache-ove za postove
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('posts:')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}