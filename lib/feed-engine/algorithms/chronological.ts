// lib/feed-engine/algorithms/chronological.ts
import { BaseAlgorithm } from './base';
import { PostSignal } from '../types';

export class ChronologicalAlgorithm extends BaseAlgorithm {
  async calculateScore(
    post: any, 
    userId?: string, 
    context?: any
  ): Promise<{ 
    score: number; 
    signals: PostSignal[]; 
    explanation?: string 
  }> {
    const signals: PostSignal[] = [];
    
    try {
      // Pure time-based score (newer = higher)
      const postTime = new Date(post.created_at).getTime();
      const now = Date.now();
      const recency = Math.max(0, 1 - (now - postTime) / (7 * 24 * 60 * 60 * 1000)); // One week window
      
      signals.push({
        name: 'time_recency',
        value: recency,
        weight: 1.0,
        description: 'How recently the post was created'
      });
      
      return {
        score: recency,
        signals,
        explanation: `This post is shown because it was created ${this.formatTimeAgo(post.created_at)}.`
      };
    } catch (error) {
      console.error('Error in calculateScore:', error);
      return {
        score: 0,
        signals: [],
        explanation: 'Error calculating score'
      };
    }
  }
  
  getDescription(): string {
    return 'Shows posts in the order they were created, newest first.';
  }
  
  private formatTimeAgo(date: string): string {
    try {
      const now = new Date();
      const postDate = new Date(date);
      const diffMs = now.getTime() - postDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${diffDays} days ago`;
    } catch (error) {
      return 'recently';
    }
  }
}