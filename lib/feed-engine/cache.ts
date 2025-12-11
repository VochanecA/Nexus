// lib/feed-engine/cache.ts
import { LRUCache } from 'lru-cache';

export class FeedCache {
  private algorithmCache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes
  });

  private feedCache = new LRUCache<string, any>({
    max: 50,
    ttl: 1000 * 60 * 1, // 1 minute
  });

  async getAlgorithm(userId: string): Promise<any | null> {
    const key = `algorithm:${userId}`;
    return this.algorithmCache.get(key) || null;
  }

  setAlgorithm(userId: string, algorithm: any): void {
    const key = `algorithm:${userId}`;
    this.algorithmCache.set(key, algorithm);
  }

  async getFeed(userId: string, algorithmId: string): Promise<any | null> {
    const key = `feed:${userId}:${algorithmId}`;
    return this.feedCache.get(key) || null;
  }

  setFeed(userId: string, algorithmId: string, feed: any): void {
    const key = `feed:${userId}:${algorithmId}`;
    this.feedCache.set(key, feed);
  }

  invalidateUser(userId: string): void {
    // Remove all cache entries for this user
    for (const key of this.algorithmCache.keys()) {
      if (key.startsWith(`algorithm:${userId}`)) {
        this.algorithmCache.delete(key);
      }
    }
    for (const key of this.feedCache.keys()) {
      if (key.startsWith(`feed:${userId}`)) {
        this.feedCache.delete(key);
      }
    }
  }
}