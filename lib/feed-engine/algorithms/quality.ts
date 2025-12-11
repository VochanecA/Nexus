// lib/feed-engine/algorithms/quality.ts
import { BaseAlgorithm } from './base';
import { PostSignal } from '../types';

interface PostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  comments_count: number;
}

interface ProfileData {
  created_at: string;
  verified: boolean;
}

interface QualityAssessment {
  quality: number;
  clickbaitScore: number;
  readingTime: number;
  sourceCredibility: number;
}

export class QualityAlgorithm extends BaseAlgorithm {
  async calculateScore(
    post: PostData, 
    userId?: string, 
    context?: Record<string, unknown>
  ): Promise<{ 
    score: number; 
    signals: PostSignal[]; 
    explanation?: string 
  }> {
    const signals: PostSignal[] = [];
    let totalScore = 0;
    
    // Assess all quality metrics
    const assessment = await this.assessPostQuality(post);
    
    // 1. Content quality assessment (40%)
    const qualityWeight = this.algorithm.weight_config.content_quality || 0.4;
    const qualityScore = assessment.quality * qualityWeight;
    totalScore += qualityScore;
    
    signals.push({
      name: 'content_quality',
      value: assessment.quality,
      weight: qualityWeight,
      description: this.algorithm.signal_descriptions.content_quality || 'AI assessment of content depth and value'
    });
    
    // 2. Clickbait detection (30%)
    const clickbaitWeight = this.algorithm.weight_config.clickbait_score || 0.3;
    const clickbaitAdjusted = (1 - assessment.clickbaitScore) * clickbaitWeight; // Lower clickbait = higher score
    totalScore += clickbaitAdjusted;
    
    signals.push({
      name: 'clickbait_score',
      value: assessment.clickbaitScore,
      weight: clickbaitWeight,
      description: this.algorithm.signal_descriptions.clickbait_score || 'Likelihood of being sensationalist'
    });
    
    // 3. Reading time (20%)
    const readingWeight = this.algorithm.weight_config.reading_time || 0.2;
    const readingScore = Math.min(assessment.readingTime / 5, 1.0) * readingWeight; // Max 5 minutes = 1.0
    totalScore += readingScore;
    
    signals.push({
      name: 'reading_time',
      value: assessment.readingTime,
      weight: readingWeight,
      description: this.algorithm.signal_descriptions.reading_time || 'Estimated time to read fully'
    });
    
    // 4. Source credibility (10%)
    const sourceWeight = this.algorithm.weight_config.source_credibility || 0.1;
    const sourceScore = assessment.sourceCredibility * sourceWeight;
    totalScore += sourceScore;
    
    signals.push({
      name: 'source_credibility',
      value: assessment.sourceCredibility,
      weight: sourceWeight,
      description: this.algorithm.signal_descriptions.source_credibility || 'Author/source reputation'
    });
    
    return {
      score: totalScore,
      signals,
      explanation: this.generateExplanation(assessment)
    };
  }
  
  private async assessPostQuality(post: PostData): Promise<QualityAssessment> {
    const [quality, clickbaitScore, readingTime, sourceCredibility] = await Promise.all([
      this.calculateContentQuality(post),
      this.calculateClickbaitScore(post.content),
      this.calculateReadingTime(post.content),
      this.calculateSourceCredibility(post.user_id)
    ]);
    
    return {
      quality,
      clickbaitScore,
      readingTime,
      sourceCredibility
    };
  }
  
  private async calculateContentQuality(post: PostData): Promise<number> {
    const content = post.content.toLowerCase();
    let score = 0.5;
    
    // Positive indicators
    if (content.length > 200) score += 0.2;
    if (content.includes('?') && content.includes('because')) score += 0.1; // Shows reasoning
    
    // Count complex words (more than 7 characters)
    const complexWords = content
      .split(/\s+/)
      .filter(word => word.length > 7)
      .length;
    
    if (complexWords > 3) score += 0.1;
    
    // Discussion indicator
    if (post.comments_count > 5) score += 0.1;
    
    // Negative indicators
    const clickbaitScore = this.calculateClickbaitScore(content);
    if (clickbaitScore > 0.7) score -= 0.3;
    
    // Excessive punctuation
    const hasMultipleExclamation = content.includes('!!!');
    const hasMultipleQuestion = content.includes('??');
    if (hasMultipleExclamation || hasMultipleQuestion) score -= 0.1;
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(1, score));
  }
  
  private calculateClickbaitScore(content: string): number {
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
    
    // Check each pattern
    clickbaitPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        score += 0.2;
      }
    });
    
    // Excessive punctuation penalty
    const exclamationCount = (content.match(/!/g) || []).length;
    const questionCount = (content.match(/\?/g) || []).length;
    
    if (exclamationCount > 2) {
      score += 0.1 * (exclamationCount - 2);
    }
    
    if (questionCount > 3) {
      score += 0.05 * (questionCount - 3);
    }
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }
  
  private calculateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    const wordsPerMinute = 200;
    return words / wordsPerMinute;
  }
  
  private async calculateSourceCredibility(userId: string): Promise<number> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('created_at, verified')
        .eq('id', userId)
        .single();
      
      if (error || !profile) {
        console.error('Error fetching profile:', error);
        return 0.5; // Default score
      }
      
      let score = 0.5;
      
      // Verified account bonus
      if (profile.verified) {
        score += 0.3;
      }
      
      // Account age bonus (max 0.2)
      if (profile.created_at) {
        const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
        const accountAgeYears = accountAgeMs / (1000 * 60 * 60 * 24 * 365);
        score += Math.min(accountAgeYears * 0.1, 0.2);
      }
      
      // Ensure score is within bounds
      return Math.max(0, Math.min(1, score));
      
    } catch (error) {
      console.error('Error calculating source credibility:', error);
      return 0.5; // Default score on error
    }
  }
  
  private generateExplanation(assessment: QualityAssessment): string {
    const parts: string[] = [];
    
    if (assessment.quality > 0.7) {
      parts.push('High-quality, substantive content.');
    } else if (assessment.quality < 0.4) {
      parts.push('Content could be more substantive.');
    }
    
    if (assessment.clickbaitScore < 0.3) {
      parts.push('Low on sensationalism.');
    } else if (assessment.clickbaitScore > 0.7) {
      parts.push('May contain clickbait elements.');
    }
    
    if (assessment.readingTime > 2) {
      parts.push('In-depth reading.');
    }
    
    if (assessment.sourceCredibility > 0.7) {
      parts.push('From a credible source.');
    }
    
    if (parts.length > 0) {
      return `${parts.join(' ')} Selected by our quality filter.`;
    }
    
    return 'Standard quality content.';
  }
  
  getDescription(): string {
    return 'Filters out clickbait and promotes substantive, credible content.';
  }
}