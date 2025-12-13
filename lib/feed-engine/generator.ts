// lib/feed-engine/generator.ts
import { createClient } from '@/lib/supabase/client';
import { FeedEngine } from './engine';
import { ChronologicalAlgorithm } from './algorithms/chronological';
import { SocialAlgorithm } from './algorithms/social';
import { QualityAlgorithm } from './algorithms/quality';
import { BaseAlgorithm, type PostData } from './algorithms/base';
import type { FeedRequest, PostExplanation, FeedAlgorithm, PostSignal } from './types';

interface ScoredPost {
  post: PostData;
  score: number;
  signals: PostSignal[];
}

interface PostWithProfile {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    verified: boolean;
  };
  likes_count: { count: number }[];
  comments_count: { count: number }[];
}

interface SupabasePost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    verified: boolean;
  } | null;
}

export class FeedGenerator {
  private feedEngine = new FeedEngine();
  private supabase = createClient();
  
  async generateFeed(request: FeedRequest): Promise<{
    posts: PostData[];
    algorithm: FeedAlgorithm;
    explanations?: Record<string, PostExplanation>;
  }> {
    console.log('[FeedGenerator] Generating feed for user:', request.userId);
    
    try {
      // Get algorithm
      const algorithm = await this.feedEngine.getUserAlgorithm(request.userId);
      console.log('[FeedGenerator] Using algorithm:', algorithm?.name);
      
      if (!algorithm) {
        console.error('[FeedGenerator] No algorithm found');
        return this.generateFallbackFeed(request);
      }
      
      // Get base posts
      const posts = await this.getBasePosts(request);
      console.log('[FeedGenerator] Fetched posts:', posts.length);
      
      if (posts.length === 0) {
        console.log('[FeedGenerator] No posts found, using fallback');
        return this.generateFallbackFeed(request, algorithm);
      }
      
      // Convert to PostData format
      const postData = posts.map(post => this.convertToPostData(post));
      
      // Score and sort posts
      const scoredPosts = await this.scorePosts(postData, algorithm, request);
      
      // Sort by score
      scoredPosts.sort((a, b) => b.score - a.score);
      
      // Apply limit and offset
      const start = request.offset || 0;
      const end = start + (request.limit || 20);
      const paginatedPosts = scoredPosts.slice(start, end);
      
      // Generate explanations if requested
      let explanations: Record<string, PostExplanation> | undefined;
      if (request.includeExplanations) {
        explanations = await this.generateExplanations(paginatedPosts, algorithm, request.userId);
      }
      
      console.log('[FeedGenerator] Feed generation complete');
      
      return {
        posts: paginatedPosts.map(p => p.post),
        algorithm,
        explanations
      };
    } catch (error) {
      console.error('[FeedGenerator] Error in generateFeed:', error);
      return this.generateFallbackFeed(request);
    }
  }
  
  private async getBasePosts(request: FeedRequest): Promise<PostWithProfile[]> {
    try {
      console.log('[FeedGenerator] getBasePosts: Starting...');
      
      // Prvo probajte osnovni query bez join-a
      const { data: postsData, error: postsError } = await this.supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      console.log('[FeedGenerator] Basic posts query result:', {
        count: postsData?.length || 0,
        error: postsError ? postsError.message : 'none'
      });
      
      if (postsError) {
        console.error('[FeedGenerator] Error fetching basic posts:', postsError);
        // Ako ne može da dobije ni osnovne postove, verovatno RLS problem
        return this.createSamplePosts();
      }
      
      if (!postsData || postsData.length === 0) {
        console.log('[FeedGenerator] No posts in database');
        return this.createSamplePosts();
      }
      
      // Dobijte sve user profile odjednom
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      console.log('[FeedGenerator] Fetching profiles for user IDs:', userIds);
      
      const { data: profilesData, error: profilesError } = await this.supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('[FeedGenerator] Error fetching profiles:', profilesError);
      }
      
      // Napravite mapu profila za brzo pretraživanje
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );
      
      console.log('[FeedGenerator] Profiles map size:', profilesMap.size);
      
      // Kombinujte postove sa profilima i dobijte broj lajkova i komentara
      const postsWithProfiles: PostWithProfile[] = [];
      
      for (const post of postsData) {
        const profile = profilesMap.get(post.user_id);
        
        // Dobijte broj lajkova i komentara za svaki post
        const { likes, comments } = await this.getPostEngagementCounts(post.id);
        
        postsWithProfiles.push({
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          user_id: post.user_id,
          profiles: profile ? {
            username: profile.username || 'unknown',
            display_name: profile.display_name || 'User',
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            verified: profile.verified || false
          } : {
            username: 'unknown',
            display_name: 'User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            verified: false
          },
          likes_count: [{ count: likes }],
          comments_count: [{ count: comments }]
        });
      }
      
      console.log(`[FeedGenerator] Successfully processed ${postsWithProfiles.length} posts`);
      return postsWithProfiles;
      
    } catch (error) {
      console.error('[FeedGenerator] Unexpected error in getBasePosts:', error);
      return this.createSamplePosts();
    }
  }
  
  private async getPostEngagementCounts(postId: string): Promise<{ likes: number; comments: number }> {
    try {
      // Paralelno dobijanje lajkova i komentara
      const [likesResult, commentsResult] = await Promise.all([
        this.supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId),
        this.supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId)
      ]);
      
      return {
        likes: likesResult.count || 0,
        comments: commentsResult.count || 0
      };
    } catch (error) {
      console.error(`[FeedGenerator] Error getting engagement counts for post ${postId}:`, error);
      return { likes: 0, comments: 0 };
    }
  }
  
  private createSamplePosts(): PostWithProfile[] {
    console.log('[FeedGenerator] Creating sample posts from real database data');
    
    // Koristite stvarne podatke iz vaše baze
    return [
      {
        id: 'bad3f1c5-1983-4ecd-a667-cb6771ca2307',
        content: 'Prva poruka',
        created_at: '2025-12-10T11:09:21.950Z',
        user_id: '55b0ac2c-4092-4dc6-9df5-14120f54d9a0',
        profiles: {
          username: 'alen.vochanec_55b0ac2c',
          display_name: 'Alen Vochanec',
          avatar_url: 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/avatars/avatars/55b0ac2c-4092-4dc6-9df5-14120f54d9a0-1765365856673.png',
          created_at: '2025-12-10T11:09:01.125Z',
          verified: false
        },
        likes_count: [{ count: 0 }],
        comments_count: [{ count: 0 }]
      },
      {
        id: 'aa2c39b0-5218-4b3a-b337-b4ddcce09e5d',
        content: 'Druga poruka #AI',
        created_at: '2025-12-11T08:06:45.647Z',
        user_id: '55b0ac2c-4092-4dc6-9df5-14120f54d9a0',
        profiles: {
          username: 'alen.vochanec_55b0ac2c',
          display_name: 'Alen Vochanec',
          avatar_url: 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/avatars/avatars/55b0ac2c-4092-4dc6-9df5-14120f54d9a0-1765365856673.png',
          created_at: '2025-12-10T11:09:01.125Z',
          verified: false
        },
        likes_count: [{ count: 0 }],
        comments_count: [{ count: 0 }]
      }
    ];
  }
  
  private async generateFallbackFeed(
    request: FeedRequest, 
    algorithm?: FeedAlgorithm
  ): Promise<{
    posts: PostData[];
    algorithm: FeedAlgorithm;
    explanations?: Record<string, PostExplanation>;
  }> {
    console.log('[FeedGenerator] Generating fallback feed');
    
    const defaultAlgorithm: FeedAlgorithm = {
      id: 'default-chronological',
      name: 'Chronological Feed',
      slug: 'chronological',
      description: 'Shows posts in the order they were created, newest first.',
      is_official: true,
      is_public: true,
      version: '1.0.0',
      algorithm_config: { type: 'chronological' },
      signal_descriptions: { time_recency: 'How recently the post was created' },
      weight_config: { time_recency: 1.0 },
      install_count: 0,
      rating: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const usedAlgorithm = algorithm || defaultAlgorithm;
    
    // Koristite sample postove kao fallback
    const samplePosts = this.createSamplePosts();
    const postData = samplePosts.map(post => this.convertToPostData(post));
    
    const scoredPosts = await this.scorePosts(postData, usedAlgorithm, request);
    scoredPosts.sort((a, b) => b.score - a.score);
    
    const start = request.offset || 0;
    const end = start + (request.limit || 20);
    const paginatedPosts = scoredPosts.slice(start, end);
    
    let explanations: Record<string, PostExplanation> | undefined;
    if (request.includeExplanations) {
      explanations = await this.generateExplanations(paginatedPosts, usedAlgorithm, request.userId);
    }
    
    return {
      posts: paginatedPosts.map(p => p.post),
      algorithm: usedAlgorithm,
      explanations
    };
  }
  
  private convertToPostData(postWithProfile: PostWithProfile): PostData {
    return {
      id: postWithProfile.id,
      content: postWithProfile.content,
      created_at: postWithProfile.created_at,
      user_id: postWithProfile.user_id,
      username: postWithProfile.profiles.username,
      display_name: postWithProfile.profiles.display_name,
      avatar_url: postWithProfile.profiles.avatar_url,
      comments_count: postWithProfile.comments_count[0]?.count || 0,
      likes_count: postWithProfile.likes_count[0]?.count || 0,
      user_has_liked: false
    };
  }
  
  private async scorePosts(
    posts: PostData[], 
    algorithm: FeedAlgorithm, 
    request: FeedRequest
  ): Promise<ScoredPost[]> {
    console.log(`[FeedGenerator] Scoring ${posts.length} posts with algorithm: ${algorithm.name}`);
    
    const algorithmInstance = this.createAlgorithmInstance(algorithm);
    
    const scoredPosts = await Promise.all(
      posts.map(async (post): Promise<ScoredPost> => {
        try {
          const result = await algorithmInstance.calculateScore(
            post, 
            request.userId, 
            request.context
          );
          
          // Log signal for explainability
          if (request.userId) {
            await this.logSignals(
              request.userId,
              post.id,
              algorithm.id,
              result.signals,
              result.score
            ).catch(err => {
              console.error('[FeedGenerator] Error logging signals:', err);
            });
          }
          
          return {
            post,
            score: result.score,
            signals: result.signals
          };
        } catch (error) {
          console.error(`[FeedGenerator] Error scoring post ${post.id}:`, error);
          return {
            post,
            score: 0,
            signals: []
          };
        }
      })
    );
    
    return scoredPosts;
  }
  
  private async generateExplanations(
    scoredPosts: ScoredPost[],
    algorithm: FeedAlgorithm,
    userId?: string
  ): Promise<Record<string, PostExplanation>> {
    const explanations: Record<string, PostExplanation> = {};
    
    for (const item of scoredPosts) {
      const topSignals = item.signals
        .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
        .slice(0, 3);
      
      explanations[item.post.id] = {
        post_id: item.post.id,
        total_score: item.score,
        signals: topSignals,
        algorithm_id: algorithm.id,
        algorithm_name: algorithm.name,
        summary: this.generateSummary(topSignals, algorithm.name)
      };
    }
    
    return explanations;
  }
  
  private createAlgorithmInstance(algorithm: FeedAlgorithm): BaseAlgorithm {
    console.log(`[FeedGenerator] Creating algorithm instance for: ${algorithm.slug}`);
    
    switch (algorithm.slug) {
      case 'chronological':
        return new ChronologicalAlgorithm(algorithm);
      case 'friends-first':
        return new SocialAlgorithm(algorithm);
      case 'quality-filter':
        return new QualityAlgorithm(algorithm);
      default:
        console.log(`[FeedGenerator] Unknown algorithm slug: ${algorithm.slug}, using chronological as fallback`);
        return new ChronologicalAlgorithm(algorithm);
    }
  }
  
  private async logSignals(
    userId: string,
    postId: string,
    algorithmId: string,
    signals: PostSignal[],
    totalScore: number
  ): Promise<void> {
    try {
      const signalData = signals.reduce((acc, signal) => ({
        ...acc,
        [signal.name]: {
          value: signal.value,
          weight: signal.weight,
          contribution: signal.value * signal.weight
        }
      }), {} as Record<string, { value: number; weight: number; contribution: number }>);

      const { error } = await this.supabase
        .from('feed_signal_logs')
        .insert({
          user_id: userId,
          post_id: postId,
          algorithm_id: algorithmId,
          signals: signalData,
          total_score: totalScore,
          explanation: {
            summary: 'Generated by algorithm',
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('[FeedGenerator] Error logging signals:', error);
      }
    } catch (error) {
      console.error('[FeedGenerator] Error in logSignals:', error);
    }
  }
  
  private generateSummary(signals: PostSignal[], algorithmName: string): string {
    if (signals.length === 0) {
      return 'No significant signals detected.';
    }
    
    const contributions = signals.map(signal => ({
      name: signal.name.replace(/_/g, ' '),
      percent: Math.round((signal.value * signal.weight) * 100)
    }));
    
    const mainContribution = contributions[0];
    let summary = `Mainly shown because of ${mainContribution.name} (${mainContribution.percent}%).`;
    
    if (contributions.length > 1) {
      const otherText = contributions.slice(1)
        .map(c => `${c.name} (${c.percent}%)`)
        .join(', ');
      summary += ` Also influenced by: ${otherText}.`;
    }
    
    return summary;
  }
}