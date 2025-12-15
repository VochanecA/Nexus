// lib/ads/ad-service.ts
import { createClient } from '@/lib/supabase/client';

export interface PromotedPost {
  id: string;
  post_id: string;
  advertiser_id: string;
  remaining_budget: number;
  bid_per_view: number;
  bid_per_like: number;
  bid_per_follow: number;
  target_hashtags: string[];
  target_categories: string[];
  target_interests: any;
  start_date: string;
  end_date: string;
  total_views: number;
  total_spent: number;
}

export interface AdExplanation {
  reasons: string[];
  hashtag_matches: string[];
  category_matches: string[];
  interest_score: number;
  engagement_score: number;
}

export interface ScoredAd {
  promoted_post: PromotedPost;
  post_data: any;
  score: number;
  explanation: AdExplanation;
}

export interface UserProfile {
  id: string;
  hashtag_interests: Record<string, number>;
  category_interests: Record<string, number>;
  manual_interests: string[];
  recent_likes: string[];
  recent_follows: string[];
}

export class AdScoringService {
  private supabase = createClient();

  /**
   * Glavna funkcija za dobijanje relevantnih reklama za korisnika
   */
  async getRelevantAdsForUser(
    userId: string | null,
    limit: number = 3
  ): Promise<ScoredAd[]> {
    try {
      // 1. Učitaj aktivne promoted posts
      const activeAds = await this.getActivePromotedPosts();
      
      if (activeAds.length === 0) {
        return [];
      }

      // 2. Učitaj korisničke interese i aktivnosti (ako je ulogovan)
      let userProfile: UserProfile | null = null;
      if (userId) {
        userProfile = await this.getUserProfile(userId);
        
        // 3. Filtriraj ads koje je korisnik već video danas
        const unseenAds = await this.filterRecentlySeenAds(userId, activeAds);
        
        if (unseenAds.length === 0) {
          return [];
        }

        // 4. Skoriraj svaki ad
        const scoredAds = await Promise.all(
          unseenAds.map(async ad => {
            const postData = await this.getPostData(ad.post_id);
            const scoring = this.calculateAdScore(ad, userProfile);
            return {
              promoted_post: ad,
              post_data: postData,
              ...scoring
            };
          })
        );

        // 5. Sortiraj po score-u i uzmi top N
        scoredAds.sort((a, b) => b.score - a.score);
        return scoredAds.slice(0, limit);
      } else {
        // Za neulogovane korisnike, random selection
        const randomAds = activeAds
          .sort(() => Math.random() - 0.5)
          .slice(0, limit);

        return await Promise.all(
          randomAds.map(async ad => {
            const postData = await this.getPostData(ad.post_id);
            return {
              promoted_post: ad,
              post_data: postData,
              score: 50,
              explanation: {
                reasons: ['Sponzorisani sadržaj'],
                hashtag_matches: [],
                category_matches: [],
                interest_score: 0,
                engagement_score: 0
              }
            };
          })
        );
      }
    } catch (error) {
      console.error('Error getting relevant ads:', error);
      return [];
    }
  }

  /**
   * Učitaj podatke o postu
   */
  private async getPostData(postId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching post data:', error);
      return null;
    }
  }

  /**
   * Izračunaj relevantnost reklame za korisnika
   */
  private calculateAdScore(
    ad: PromotedPost,
    user: UserProfile | null
  ): { score: number; explanation: AdExplanation } {
    if (!user) {
      return {
        score: 50,
        explanation: {
          reasons: ['Sponzorisani sadržaj'],
          hashtag_matches: [],
          category_matches: [],
          interest_score: 0,
          engagement_score: 0
        }
      };
    }

    let score = 0;
    const explanation: AdExplanation = {
      reasons: [],
      hashtag_matches: [],
      category_matches: [],
      interest_score: 0,
      engagement_score: 0
    };

    // 1. Hashtag matching (35% težine)
    const hashtagScore = this.calculateHashtagScore(
      ad.target_hashtags,
      user.hashtag_interests
    );
    if (hashtagScore > 0) {
      score += hashtagScore * 0.35;
      explanation.interest_score += hashtagScore * 0.35;
      
      const matches = ad.target_hashtags.filter(tag => 
        user.hashtag_interests[tag] > 0
      );
      explanation.hashtag_matches = matches;
      
      if (matches.length > 0) {
        explanation.reasons.push(
          `Pratiš hashtag${matches.length > 1 ? 'ove' : ''}: ${matches.slice(0, 3).join(', ')}`
        );
      }
    }

    // 2. Category matching (25% težine)
    const categoryScore = this.calculateCategoryScore(
      ad.target_categories,
      user.category_interests
    );
    if (categoryScore > 0) {
      score += categoryScore * 0.25;
      explanation.interest_score += categoryScore * 0.25;
      
      const matches = ad.target_categories.filter(cat => 
        user.category_interests[cat] > 0
      );
      explanation.category_matches = matches;
      
      if (matches.length > 0) {
        explanation.reasons.push(
          `Interesuje te: ${matches.slice(0, 2).join(', ')}`
        );
      }
    }

    // 3. Engagement history (20% težine)
    const engagementScore = this.calculateEngagementScore(ad, user);
    if (engagementScore > 0) {
      score += engagementScore * 0.20;
      explanation.engagement_score = engagementScore * 0.20;
      
      if (user.recent_follows.includes(ad.advertiser_id)) {
        explanation.reasons.push('Pratiš ovog kreatora');
      } else if (engagementScore > 0.5) {
        explanation.reasons.push('Sličan sadržaj ti se sviđa');
      }
    }

    // 4. Bid amount (20% težine)
    const bidScore = Math.min(ad.bid_per_view / 0.10, 1);
    score += bidScore * 0.20;

    // Normalizuj finalni score na 0-100
    score = Math.min(score * 100, 100);

    // Dodaj generički razlog ako nema specifičnih
    if (explanation.reasons.length === 0) {
      explanation.reasons.push('Na osnovu tvoje aktivnosti na platformi');
    }

    return { score, explanation };
  }

  private calculateHashtagScore(
    adHashtags: string[],
    userHashtagInterests: Record<string, number>
  ): number {
    if (adHashtags.length === 0) return 0;

    let totalScore = 0;
    let matchCount = 0;

    for (const hashtag of adHashtags) {
      const userInterest = userHashtagInterests[hashtag] || 0;
      if (userInterest > 0) {
        totalScore += userInterest;
        matchCount++;
      }
    }

    const avgScore = matchCount > 0 ? totalScore / matchCount : 0;
    const matchBonus = Math.min(matchCount / adHashtags.length, 1);
    
    return avgScore * 0.7 + matchBonus * 0.3;
  }

  private calculateCategoryScore(
    adCategories: string[],
    userCategoryInterests: Record<string, number>
  ): number {
    if (adCategories.length === 0) return 0;

    let totalScore = 0;
    for (const category of adCategories) {
      totalScore += userCategoryInterests[category] || 0;
    }

    return Math.min(totalScore / adCategories.length, 1);
  }

  private calculateEngagementScore(ad: PromotedPost, user: UserProfile): number {
    let score = 0;

    if (user.recent_follows.includes(ad.advertiser_id)) {
      score += 0.8;
    }

    const similarLikes = user.recent_likes.length > 0 ? 0.3 : 0;
    score += similarLikes;

    return Math.min(score, 1);
  }

  private async getActivePromotedPosts(): Promise<PromotedPost[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('promoted_posts')
        .select('*')
        .eq('status', 'active')
        .gt('remaining_budget', 0)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('bid_per_view', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active promoted posts:', error);
      return [];
    }
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Učitaj interese
      const { data: interests } = await this.supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Učitaj nedavne like-ove
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: likes } = await this.supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(100);

      // Učitaj nedavne follows
      const { data: follows } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      return {
        id: userId,
        hashtag_interests: interests?.hashtag_interests || {},
        category_interests: interests?.category_interests || {},
        manual_interests: interests?.manual_interests || [],
        recent_likes: likes?.map(l => l.post_id) || [],
        recent_follows: follows?.map(f => f.following_id) || []
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        id: userId,
        hashtag_interests: {},
        category_interests: {},
        manual_interests: [],
        recent_likes: [],
        recent_follows: []
      };
    }
  }

  private async filterRecentlySeenAds(
    userId: string,
    ads: PromotedPost[]
  ): Promise<PromotedPost[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: seenToday } = await this.supabase
        .from('ad_impressions')
        .select('promoted_post_id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      const seenIds = new Set(seenToday?.map(s => s.promoted_post_id) || []);
      
      return ads.filter(ad => !seenIds.has(ad.id));
    } catch (error) {
      console.error('Error filtering seen ads:', error);
      return ads;
    }
  }

  /**
   * Zabeleži prikazivanje reklame
   */
  async recordAdImpression(
    promotedPostId: string,
    userId: string,
    interactionType: 'view' | 'like' | 'follow',
    explanation: AdExplanation,
    relevanceScore: number
  ): Promise<void> {
    try {
      // Učitaj promoted post za trošak
      const { data: promotedPost } = await this.supabase
        .from('promoted_posts')
        .select('*')
        .eq('id', promotedPostId)
        .single();

      if (!promotedPost) return;

      // Odredi trošak
      let cost = 0;
      switch (interactionType) {
        case 'view':
          cost = promotedPost.bid_per_view;
          break;
        case 'like':
          cost = promotedPost.bid_per_like;
          break;
        case 'follow':
          cost = promotedPost.bid_per_follow;
          break;
      }

      // Proveri da li ima dovoljno budžeta
      if (promotedPost.remaining_budget < cost) {
        await this.supabase
          .from('promoted_posts')
          .update({ status: 'completed' })
          .eq('id', promotedPostId);
        return;
      }

      // Zabeleži impression
      await this.supabase.from('ad_impressions').insert({
        promoted_post_id: promotedPostId,
        user_id: userId,
        interaction_type: interactionType,
        cost,
        explanation,
        relevance_score: relevanceScore
      });

      // Ažuriraj budžet i statistiku
      const updates: any = {
        remaining_budget: promotedPost.remaining_budget - cost,
        total_spent: promotedPost.total_spent + cost,
        updated_at: new Date().toISOString()
      };

      if (interactionType === 'view') updates.total_views = promotedPost.total_views + 1;
      if (interactionType === 'like') updates.total_likes = promotedPost.total_likes + 1;
      if (interactionType === 'follow') updates.total_follows = promotedPost.total_follows + 1;

      await this.supabase
        .from('promoted_posts')
        .update(updates)
        .eq('id', promotedPostId);
    } catch (error) {
      console.error('Error recording ad impression:', error);
    }
  }
}

export const adService = new AdScoringService();