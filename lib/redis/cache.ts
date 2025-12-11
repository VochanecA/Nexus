// lib/redis/cache.ts
import { Redis } from '@upstash/redis';
import { Post } from '@/types'; // <-- DODAJTE OVAJ IMPORT

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CachedPosts {
  posts: Post[];
  timestamp: number;
  algorithm: string;
}

const CACHE_TTL = 60; // 60 seconds

export async function getCachedPosts(algorithm: string): Promise<Post[] | null> {
  try {
    const cached = await redis.get<CachedPosts>(`posts:${algorithm}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return cached.posts;
    }
    return null;
  } catch (error) {
    console.error('Redis cache error:', error);
    return null;
  }
}

export async function setCachedPosts(algorithm: string, posts: Post[]): Promise<void> {
  try {
    await redis.set(`posts:${algorithm}`, {
      posts,
      timestamp: Date.now(),
      algorithm
    } as CachedPosts, { ex: CACHE_TTL }); // Preporučujemo dodavanje TTL-a i na set operaciji
  } catch (error) {
    console.error('Redis cache set error:', error);
  }
}