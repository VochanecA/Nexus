// lib/feed-engine/algorithms/social.ts (ispravka)
import { BaseAlgorithm } from './base';
import { PostSignal } from '../types';

export class SocialAlgorithm extends BaseAlgorithm {
  async calculateScore(post: any, userId?: string, context?: any): Promise<{ 
    score: number; 
    signals: PostSignal[]; 
    explanation?: string 
  }> {
    const signals: PostSignal[] = [];
    let totalScore = 0;
    
    if (!userId) {
      return { score: 0, signals, explanation: 'You need to be logged in for this algorithm.' };
    }
    
    // 1. Follow level (40%)
    const followLevel = await this.getUserFollowLevel(userId, post.user_id);
    const followWeight = this.algorithm.weight_config.follow_level || 0.4;
    const followScore = followLevel * followWeight;
    totalScore += followScore;
    
    signals.push({
      name: 'follow_level',
      value: followLevel,
      weight: followWeight,
      description: this.algorithm.signal_descriptions.follow_level || 'How closely connected you are to the author'
    });
    
    // 2. Engagement history (40%)
    const engagementHistory = await this.getEngagementHistory(userId, post.user_id);
    const engagementWeight = this.algorithm.weight_config.engagement_history || 0.4;
    const engagementScore = engagementHistory * engagementWeight;
    totalScore += engagementScore;
    
    signals.push({
      name: 'engagement_history',
      value: engagementHistory,
      weight: engagementWeight,
      description: this.algorithm.signal_descriptions.engagement_history || 'Your past interactions with this author'
    });
    
    // 3. Mutual connections (20%)
    const mutualConnections = await this.getMutualConnections(userId, post.user_id);
    const mutualWeight = this.algorithm.weight_config.mutual_connections || 0.2;
    const mutualScore = mutualConnections * mutualWeight;
    totalScore += mutualScore;
    
    signals.push({
      name: 'mutual_connections',
      value: mutualConnections,
      weight: mutualWeight,
      description: this.algorithm.signal_descriptions.mutual_connections || 'Number of mutual friends'
    });
    
    // 4. Time decay (bonus za nove postove)
    const timeDecay = this.calculateTimeDecay(post.created_at);
    const timeWeight = 0.1; // Bonus weight
    const timeScore = timeDecay * timeWeight;
    totalScore += timeScore;
    
    signals.push({
      name: 'time_recency',
      value: timeDecay,
      weight: timeWeight,
      description: 'Recency bonus for new posts'
    });
    
    return {
      score: totalScore,
      signals,
      explanation: this.generateExplanation(followLevel, engagementHistory, mutualConnections, timeDecay)
    };
  }
  
  private generateExplanation(followLevel: number, engagement: number, mutual: number, recency: number): string {
    const parts = [];
    
    if (followLevel > 0.5) {
      parts.push('You follow this author.');
    }
    
    if (engagement > 0.3) {
      parts.push('You frequently engage with their content.');
    }
    
    if (mutual > 0.4) {
      parts.push('You have many mutual connections.');
    }
    
    if (recency > 0.8) {
      parts.push('This post is very recent.');
    }
    
    if (parts.length === 0) {
      return 'This post is from someone in your extended network.';
    }
    
    return parts.join(' ') + ' That\'s why it appears higher in your feed.';
  }
  
  getDescription(): string {
    return 'Prioritizes content from people you know and interact with most.';
  }
}