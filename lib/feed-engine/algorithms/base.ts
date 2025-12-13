// lib/feed-engine/algorithms/base.ts
import { createClient } from '@/lib/supabase/client';
import { FeedAlgorithm, PostSignal } from '../types';

export interface PostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  comments_count: number;
  likes_count: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  user_has_liked: boolean;
}

export abstract class BaseAlgorithm {
  protected supabase = createClient();
  protected algorithm: FeedAlgorithm;
  
  constructor(algorithm: FeedAlgorithm) {
    this.algorithm = algorithm;
  }
  
  abstract calculateScore(
    post: PostData, 
    userId?: string, 
    context?: Record<string, unknown>
  ): Promise<{ score: number; signals: PostSignal[]; explanation?: string }>;
  
  abstract getDescription(): string;
  
  // Common helper methods
  protected async getUserFollowLevel(userId: string, authorId: string): Promise<number> {
    if (userId === authorId) return 1.0;
    
    const { data } = await this.supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId)
      .eq('following_id', authorId)
      .single();
    
    return data ? 1.0 : 0.0;
  }
  
  protected calculateTimeDecay(createdAt: string, maxAgeHours: number = 168): number {
    const now = new Date();
    const postTime = new Date(createdAt);
    const hoursSince = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince > maxAgeHours) return 0;
    return Math.exp(-hoursSince / (maxAgeHours / 2));
  }
  
  protected async getEngagementHistory(userId: string, authorId: string): Promise<number> {
    try {
      // Prvo dobijemo sve postove autora
      const { data: authorPosts, error: postsError } = await this.supabase
        .from('posts')
        .select('id')
        .eq('user_id', authorId);
      
      if (postsError) {
        console.error('Error fetching author posts:', postsError);
        return 0;
      }
      
      if (!authorPosts || authorPosts.length === 0) {
        return 0;
      }
      
      const postIds = authorPosts.map(post => post.id);
      
      // Batch queries za effikasnost
      const [likesResult, commentsResult] = await Promise.all([
        this.supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('post_id', postIds),
        this.supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('post_id', postIds)
      ]);
      
      const likesCount = likesResult.count || 0;
      const commentsCount = commentsResult.count || 0;
      const totalInteractions = likesCount + commentsCount;
      
      // Normalize to 0-1 range (max 100 interactions = 1.0)
      return Math.min(totalInteractions / 100, 1.0);
      
    } catch (error) {
      console.error('Error getting engagement history:', error);
      return 0;
    }
  }
  
  // Nova helper metoda za mutual connections
  protected async getMutualConnections(userId: string, authorId: string): Promise<number> {
    try {
      // Dobij korisnike koje prati autor
      const { data: authorFollowing, error: authorError } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', authorId);
      
      if (authorError) {
        console.error('Error fetching author following:', authorError);
        return 0;
      }
      
      if (!authorFollowing || authorFollowing.length === 0) {
        return 0;
      }
      
      const authorFollowingIds = authorFollowing.map(f => f.following_id);
      
      // Broj mutual follows - korisnici koje oboje prate
      const { count, error: mutualError } = await this.supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
        .in('following_id', authorFollowingIds);
      
      if (mutualError) {
        console.error('Error fetching mutual connections:', mutualError);
        return 0;
      }
      
      return Math.min((count || 0) / 10, 1.0); // Normalize
      
    } catch (error) {
      console.error('Error getting mutual connections:', error);
      return 0;
    }
  }
  
  // Helper za ekstrakciju hashtagova
  protected extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  }
  
  // Helper za detekciju clickbaita
  protected detectClickbait(content: string): number {
    const clickbaitPatterns = [
      /you won[']?t believe/i,
      /this (will|is going to) blow your mind/i,
      /number \d+ will shock you/i,
      /(before|after) (and|vs)/i,
      /the reason why/i,
      /(everyone|people) are (going crazy|losing it)/i,
      /(secret|hidden|they don[']?t want you to know)/i
    ];
    
    let score = 0;
    clickbaitPatterns.forEach(pattern => {
      if (pattern.test(content)) score += 0.2;
    });
    
    // Excessive punctuation
    const exclams = (content.match(/!/g) || []).length;
    const questions = (content.match(/\?/g) || []).length;
    if (exclams > 2) score += 0.1 * (exclams - 2);
    if (questions > 3) score += 0.05 * (questions - 3);
    
    return Math.min(score, 1.0);
  }
  
  // Helper za procjenu vremena čitanja
  protected estimateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    const wordsPerMinute = 200;
    return words / wordsPerMinute;
  }
  
  // Helper za procjenu kvaliteta sadržaja
  protected assessContentQuality(post: PostData): number {
    const content = post.content.toLowerCase();
    let score = 0.5;
    
    // Positive indicators
    if (content.length > 200) score += 0.2;
    if (content.includes('?') && content.includes('because')) score += 0.1; // Shows reasoning
    
    const complexWords = content.split(' ').filter(word => word.length > 7).length;
    if (complexWords > 3) score += 0.1;
    
    if (post.comments_count > 5) score += 0.1; // Discussion
    
    // Negative indicators
    if (this.detectClickbait(content) > 0.7) score -= 0.3;
    if (content.includes('!!!') || content.includes('??')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}