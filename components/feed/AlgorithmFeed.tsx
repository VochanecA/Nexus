// components/feed/AlgorithmFeed.tsx - ULTRA OPTIMIZOVAN KOD BEZ VIRTUAL SCROLLING-A
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FeedGenerator } from '@/lib/feed-engine/generator';
import { PostCard } from '@/components/post/post-card';
import type { Post as PostCardPost } from '@/components/post/post-card';
import { AdPost } from '@/components/ads/AdPost';
import { ExplanationPanel } from './ExplanationPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Info, Settings, TrendingUp, Bell, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { adService } from '@/lib/ads/ad-service';
import type { ScoredAd, AdExplanation } from '@/lib/ads/ad-service';
import { Switch } from '@/components/ui/switch';
import { detectAdvertisement } from '@/components/utils/ad-detector';
import { toast } from 'sonner';

interface AlgorithmFeedProps {
  userId?: string;
  initialAlgorithm?: string;
  showExplanations?: boolean;
}

type Post = PostCardPost;

interface PostData {
  id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
  is_public?: boolean;
  impressions?: number;
  is_ad?: boolean;
  content_hash?: string;
  signature?: string;
  provenance?: any;
  image_width?: number;
  image_height?: number;
  image_aspect_ratio?: number;
}

interface FeedItem {
  type: 'post' | 'ad';
  id: string;
  data: Post | ScoredAd;
}

interface AdPreferences {
  show_ads: boolean;
  max_ads: number;
  ads_interval: number;
  hide_ads_completely: boolean;
}

// ============ SIMPLE CACHE SYSTEM ============
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  set(key: string, data: any, ttl = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Auto cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > 30000) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// ============ HELPER FUNCTIONS ============
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url.trim();
};

const convertPostDataToPost = (postData: PostData): Post => {
  return {
    id: postData.id,
    content: postData.content,
    image_url: normalizeImageUrl(postData.image_url),
    created_at: postData.created_at,
    user_id: postData.user_id,
    username: postData.username || 'user',
    display_name: postData.display_name || 'User',
    avatar_url: postData.avatar_url || null,
    likes_count: postData.likes_count || 0,
    comments_count: postData.comments_count || 0,
    user_has_liked: postData.user_has_liked || false,
    is_public: postData.is_public,
    impressions: postData.impressions,
    is_ad: postData.is_ad || false,
    content_hash: postData.content_hash,
    signature: postData.signature,
    provenance: postData.provenance,
    image_width: postData.image_width,
    image_height: postData.image_height,
    image_aspect_ratio: postData.image_aspect_ratio,
  };
};

// ============ MAIN COMPONENT - SIMPLIFIED ============
export function AlgorithmFeed({ 
  userId, 
  initialAlgorithm,
  showExplanations = false 
}: AlgorithmFeedProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [algorithm, setAlgorithm] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [showAllExplanations, setShowAllExplanations] = useState(showExplanations);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);
  
  // Ad preferences
  const [adsInterval, setAdsInterval] = useState<number>(5);
  const [showAds, setShowAds] = useState<boolean>(true);
  const [maxAdsToShow, setMaxAdsToShow] = useState<number>(3);
  const [hideAdsCompletely, setHideAdsCompletely] = useState<boolean>(false);
  
  // Persistence
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false);
  const [savingPreferences, setSavingPreferences] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [originalPreferences, setOriginalPreferences] = useState<AdPreferences | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // ============ CREATE DEFAULT AD EXPLANATION ============
  const createDefaultAdExplanation = useCallback((): AdExplanation => ({
    reasons: ['user_interaction'],
    hashtag_matches: [],
    category_matches: [],
    interest_score: 0,
    engagement_score: 0
  }), []);

  // ============ GET AD BY ID HELPER ============
  const getAdById = useCallback((promotedPostId: string): ScoredAd | null => {
    const adItem = feedItems.find(item => 
      item.type === 'ad' && (item.data as ScoredAd).promoted_post.id === promotedPostId
    );
    
    return adItem?.type === 'ad' ? (adItem.data as ScoredAd) : null;
  }, [feedItems]);

  // ============ OPTIMIZED FETCH FUNCTIONS ============
  const fetchPostsWithImages = useCallback(async (): Promise<Post[]> => {
    try {
      const cacheKey = `posts_${userId}_${initialAlgorithm}`;
      const cached = cache.get<Post[]>(cacheKey);
      
      if (cached) {
        console.log('📦 Using cached posts');
        return cached;
      }

      const { data: postsWithProfiles, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!postsWithProfiles) return [];

      const formattedPosts: Post[] = postsWithProfiles.map((post: any) => ({
        id: post.id,
        content: post.content,
        image_url: normalizeImageUrl(post.image_url),
        created_at: post.created_at,
        user_id: post.user_id,
        username: post.profiles?.username || 'user',
        display_name: post.profiles?.display_name || 'User',
        avatar_url: post.profiles?.avatar_url || null,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
        is_public: post.is_public,
        impressions: post.impressions,
        is_ad: post.is_ad || false,
        content_hash: post.content_hash,
        signature: post.signature,
        provenance: post.provenance,
        image_width: post.image_width,
        image_height: post.image_height,
        image_aspect_ratio: post.image_aspect_ratio,
      }));

      cache.set(cacheKey, formattedPosts);
      return formattedPosts;
    } catch (err) {
      console.error('Error fetching posts:', err);
      return [];
    }
  }, [supabase, userId, initialAlgorithm]);

const fetchAds = useCallback(async (): Promise<ScoredAd[]> => {
  if (!showAds || maxAdsToShow === 0 || hideAdsCompletely) {
    return [];
  }

  try {
    const cacheKey = `ads_${userId || 'anonymous'}`;
    const cached = cache.get<ScoredAd[]>(cacheKey);
    
    if (cached) {
      return cached.slice(0, maxAdsToShow);
    }

    // Jasno definisanje tipa
    const userIdParam: string | null = userId ? userId : null;
    
    const allAds = await adService.getRelevantAdsForUser(userIdParam, 20);
    const shuffledAds = [...allAds].sort(() => Math.random() - 0.5);
    
    cache.set(cacheKey, shuffledAds);
    return shuffledAds.slice(0, maxAdsToShow);
  } catch (adError) {
    console.error('Error loading ads:', adError);
    return [];
  }
}, [showAds, maxAdsToShow, hideAdsCompletely, userId]);

  // ============ LOAD USER PREFERENCES ============
  const loadUserPreferences = useCallback(async () => {
    if (!userId) {
      setPreferencesLoaded(true);
      return;
    }

    try {
      const cacheKey = `prefs_${userId}`;
      const cached = cache.get<AdPreferences>(cacheKey);
      
      if (cached) {
        setShowAds(cached.show_ads);
        setMaxAdsToShow(cached.max_ads);
        setAdsInterval(cached.ads_interval);
        setHideAdsCompletely(cached.hide_ads_completely);
        setOriginalPreferences(cached);
        setPreferencesLoaded(true);
        return;
      }

      const response = await fetch('/api/user/ad-preferences', {
        cache: 'force-cache'
      });
      
      if (response.ok) {
        const prefs: AdPreferences = await response.json();
        cache.set(cacheKey, prefs);
        
        setShowAds(prefs.show_ads);
        setMaxAdsToShow(prefs.max_ads);
        setAdsInterval(prefs.ads_interval);
        setHideAdsCompletely(prefs.hide_ads_completely);
        setOriginalPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setPreferencesLoaded(true);
    }
  }, [userId]);

  // ============ SIMPLE FEED LOADER ============
  const loadFeed = useCallback(async (forceRefresh = false) => {
    if (!preferencesLoaded) return;

    // Cancel previous
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    
    try {
      // Clear cache if force refresh
      if (forceRefresh) {
        cache.clear();
      }

      // Parallel fetch - optimized
      const [posts, ads, algorithmData] = await Promise.allSettled([
        fetchPostsWithImages(),
        fetchAds(),
        new FeedGenerator().generateFeed({
          userId,
          algorithmSlug: initialAlgorithm,
          limit: 20,
          includeExplanations: showAllExplanations
        })
      ]);

      if (controller.signal.aborted) return;

      // Process results
      const postsResult = posts.status === 'fulfilled' ? posts.value : [];
      const adsResult = ads.status === 'fulfilled' ? ads.value : [];
      const algorithmResult = algorithmData.status === 'fulfilled' ? algorithmData.value : null;

      if (algorithmResult) {
        setAlgorithm(algorithmResult.algorithm);
        if (algorithmResult.explanations) {
          setExplanations(algorithmResult.explanations);
        }
      }

      // Interleave posts with ads
      const feed: FeedItem[] = [];
      let postIndex = 0;
      let adIndex = 0;
      let postsSinceLastAd = 0;

      while (postIndex < postsResult.length) {
        // Add post
        feed.push({
          type: 'post',
          id: postsResult[postIndex].id,
          data: postsResult[postIndex]
        });
        
        postsSinceLastAd++;
        postIndex++;

        // Check if we should add ad
        if (
          showAds && 
          !hideAdsCompletely && 
          maxAdsToShow > 0 &&
          adIndex < adsResult.length &&
          postsSinceLastAd >= adsInterval &&
          postIndex > 0 &&
          postIndex < postsResult.length
        ) {
          feed.push({
            type: 'ad',
            id: `ad-${adsResult[adIndex].promoted_post.id}`,
            data: adsResult[adIndex]
          });
          
          adIndex++;
          postsSinceLastAd = 0;
        }
      }

      setFeedItems(feed);

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error loading feed:', error);
        
        // Fallback to cached posts
        const cachedPosts = cache.get<Post[]>(`posts_${userId}_${initialAlgorithm}`);
        if (cachedPosts) {
          setFeedItems(cachedPosts.map(post => ({
            type: 'post',
            id: post.id,
            data: post
          })));
        }
      }
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    userId,
    initialAlgorithm,
    showAllExplanations,
    preferencesLoaded,
    fetchPostsWithImages,
    fetchAds,
    adsInterval,
    showAds,
    maxAdsToShow,
    hideAdsCompletely
  ]);

  // ============ USE EFFECTS ============
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      await loadUserPreferences();
      if (preferencesLoaded) {
        loadFeed();
      }
    };
    
    init();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadUserPreferences, loadFeed, preferencesLoaded]);

  // Check for unsaved changes
  useEffect(() => {
    if (!originalPreferences) {
      setHasUnsavedChanges(false);
      return;
    }

    const changed = 
      originalPreferences.show_ads !== showAds ||
      originalPreferences.max_ads !== maxAdsToShow ||
      originalPreferences.ads_interval !== adsInterval ||
      originalPreferences.hide_ads_completely !== hideAdsCompletely;

    setHasUnsavedChanges(changed);
  }, [showAds, maxAdsToShow, adsInterval, hideAdsCompletely, originalPreferences]);

  // ============ EVENT HANDLERS ============
  const handleRefresh = async () => {
    setRefreshing(true);
    cache.clear();
    await loadFeed(true);
    setRefreshing(false);
  };

  const toggleExplanation = (postId: string) => {
    setActiveExplanation(activeExplanation === postId ? null : postId);
  };

  const toggleAllExplanations = () => {
    const newState = !showAllExplanations;
    setShowAllExplanations(newState);
    if (newState) {
      loadFeed();
    }
  };

  // ============ POPRAVLJENI AD HANDLERI ============
  const handleAdView = useCallback(async (promotedPostId: string) => {
    if (!userId) return;
    
    const ad = getAdById(promotedPostId);
    const explanation = ad?.explanation || createDefaultAdExplanation();
    const score = ad?.score || 50;
    
    try {
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'view',
        explanation,
        score
      );
    } catch (error) {
      console.error('Error recording ad view:', error);
    }
  }, [userId, getAdById, createDefaultAdExplanation]);

  const handleAdLike = useCallback(async (promotedPostId: string) => {
    if (!userId) return;
    
    const ad = getAdById(promotedPostId);
    const explanation = ad?.explanation || createDefaultAdExplanation();
    const score = ad?.score || 50;
    
    try {
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'like',
        explanation,
        score
      );
    } catch (error) {
      console.error('Error recording ad like:', error);
    }
  }, [userId, getAdById, createDefaultAdExplanation]);

  const handleAdFollow = useCallback(async (promotedPostId: string) => {
    if (!userId) return;
    
    const ad = getAdById(promotedPostId);
    const explanation = ad?.explanation || createDefaultAdExplanation();
    const score = ad?.score || 50;
    
    try {
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'follow',
        explanation,
        score
      );
    } catch (error) {
      console.error('Error recording ad follow:', error);
    }
  }, [userId, getAdById, createDefaultAdExplanation]);

  const handleAdsIntervalChange = (interval: number) => {
    setAdsInterval(interval);
  };

  const handleMaxAdsChange = (count: number) => {
    setMaxAdsToShow(count);
    if (count === 0) {
      setHideAdsCompletely(true);
      setShowAds(false);
    } else {
      setHideAdsCompletely(false);
      setShowAds(true);
    }
  };

  const toggleHideAdsCompletely = () => {
    const newHideState = !hideAdsCompletely;
    setHideAdsCompletely(newHideState);
    if (newHideState) {
      setShowAds(false);
      setMaxAdsToShow(0);
    } else {
      setShowAds(true);
      setMaxAdsToShow(3);
    }
  };

const saveUserPreferences = async () => {
  if (!userId) {
    toast.error('You must be logged in to save preferences');
    return;
  }

  setSavingPreferences(true);
  
  try {
    const preferences: AdPreferences = {
      show_ads: showAds,
      max_ads: maxAdsToShow,
      ads_interval: adsInterval,
      hide_ads_completely: hideAdsCompletely
    };

    await fetch('/api/user/ad-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
      keepalive: true
    });

    cache.set(`prefs_${userId}`, preferences);
    setOriginalPreferences(preferences);
    setHasUnsavedChanges(false);
    
    toast.success('Ad preferences saved');
  } catch (error) {
    toast.error('Failed to save ad preferences');
  } finally {
    setSavingPreferences(false);
  }
};

const resetPreferences = async () => {
  const defaultPrefs: AdPreferences = {
    show_ads: true,
    max_ads: 3,
    ads_interval: 5,
    hide_ads_completely: false
  };

  if (userId) {
    fetch('/api/user/ad-preferences', { method: 'DELETE' }).catch(() => {});
    cache.set(`prefs_${userId}`, defaultPrefs);
  }

  setShowAds(true);
  setMaxAdsToShow(3);
  setAdsInterval(5);
  setHideAdsCompletely(false);
  setHasUnsavedChanges(false);
  setOriginalPreferences(defaultPrefs);
  
  toast.success('Ad preferences reset to default');
};

  // ============ RENDER ============
  if (loading && !refreshing && !preferencesLoaded) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const adsStats = {
    totalPosts: feedItems.filter(item => item.type === 'post').length,
    totalAds: feedItems.filter(item => item.type === 'ad').length,
    adsPercentage: feedItems.filter(item => item.type === 'post').length > 0 
      ? ((feedItems.filter(item => item.type === 'ad').length / feedItems.filter(item => item.type === 'post').length) * 100).toFixed(1)
      : '0'
  };

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {algorithm?.name || 'Your Feed'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {algorithm?.description || 'Loading...'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Ad Controls */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border">
            <Bell className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-2">
              {hideAdsCompletely || maxAdsToShow === 0 ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-green-500" />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium">
                    {(hideAdsCompletely || maxAdsToShow === 0) ? 'No ads' : 'Ads'}
                  </span>
                  <Switch
                    checked={!(hideAdsCompletely || maxAdsToShow === 0)}
                    onCheckedChange={toggleHideAdsCompletely}
                    className="scale-90"
                  />
                </div>
                {!(hideAdsCompletely || maxAdsToShow === 0) && (
                  <span className="text-[10px] text-muted-foreground">
                    {maxAdsToShow === 0 ? '0 ads' : `${maxAdsToShow} max`}
                  </span>
                )}
              </div>
            </div>
            
            {!(hideAdsCompletely || maxAdsToShow === 0) && (
              <>
                <span className="text-sm text-muted-foreground">Every:</span>
                <select 
                  value={adsInterval}
                  onChange={(e) => handleAdsIntervalChange(Number(e.target.value))}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value={2}>2 posts</option>
                  <option value={3}>3 posts</option>
                  <option value={4}>4 posts</option>
                  <option value={5}>5 posts</option>
                  <option value={10}>10 posts</option>
                </select>
                
                <span className="text-sm text-muted-foreground">Max:</span>
                <select 
                  value={maxAdsToShow}
                  onChange={(e) => handleMaxAdsChange(Number(e.target.value))}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value={0}>0 ads</option>
                  <option value={1}>1 ad</option>
                  <option value={2}>2 ads</option>
                  <option value={3}>3 ads</option>
                  <option value={5}>5 ads</option>
                  <option value={10}>10 ads</option>
                </select>
              </>
            )}
          </div>

          {/* Save/Reset Buttons */}
          {userId && (
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={saveUserPreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={resetPreferences}
                title="Reset to default"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Algorithm
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleAllExplanations}>
                <Info className="h-4 w-4 mr-2" />
                {showAllExplanations ? 'Hide explanations' : 'Show explanations'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/algorithms')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Browse algorithms
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/algorithms?tab=installed')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage installed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh feed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Feed stats:</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span>{adsStats.totalPosts} posts</span>
            {!(hideAdsCompletely || maxAdsToShow === 0) ? (
              <>
                <span>{adsStats.totalAds} ads</span>
                <span>{adsStats.adsPercentage}% ad density</span>
                <span>Interval: every {adsInterval} posts</span>
                <span>Max: {maxAdsToShow} ads</span>
              </>
            ) : (
              <span className="text-green-600 font-medium">✓ All ads disabled</span>
            )}
          </div>
        </div>
        
        {hasUnsavedChanges && userId && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-medium">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Feed Items - SIMPLE LIST WITHOUT VIRTUAL SCROLLING */}
      {feedItems.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">
            {algorithm?.name === 'Friends First' 
              ? 'Follow some people to see their posts here!'
              : 'Be the first to post or try a different algorithm.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/explore">
              <Button variant="outline">Explore</Button>
            </Link>
            <Link href="/algorithms">
              <Button>Try another algorithm</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {feedItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="space-y-4">
              {!(hideAdsCompletely || maxAdsToShow === 0) && item.type === 'ad' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Sponsored • Ad #{index + 1} in feed</span>
                </div>
              )}
              
              {item.type === 'ad' && !(hideAdsCompletely || maxAdsToShow === 0) ? (
                <AdPost
                  promotedPostId={(item.data as ScoredAd).promoted_post.id}
                  postData={(item.data as ScoredAd).post_data}
                  explanation={(item.data as ScoredAd).explanation}
                  onView={() => handleAdView((item.data as ScoredAd).promoted_post.id)}
                  onLike={() => handleAdLike((item.data as ScoredAd).promoted_post.id)}
                  onFollow={() => handleAdFollow((item.data as ScoredAd).promoted_post.id)}
                />
              ) : (
                <div className="relative">
                  <PostCard 
                    post={item.data as PostCardPost}
                    currentUserId={userId}
                    hideAdBadges={hideAdsCompletely || maxAdsToShow === 0}
                  />
                  
                  {showAllExplanations && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                      onClick={() => toggleExplanation(item.id)}
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {item.type === 'post' && showAllExplanations && activeExplanation === item.id && (
                <div className="ml-8">
                  <ExplanationPanel
                    postId={item.id}
                    explanation={explanations[item.id]}
                    onClose={() => setActiveExplanation(null)}
                  />
                </div>
              )}
              
              {item.type === 'post' && showAllExplanations && explanations[item.id] && !activeExplanation && (
                <div className="ml-8">
                  <button
                    onClick={() => toggleExplanation(item.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Info className="h-3 w-3" />
                    <span>{explanations[item.id]?.summary?.split('.')[0]}...</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feed Footer */}
      {feedItems.length > 0 && (
        <div className="pt-6 border-t">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>
                Powered by {algorithm?.name}
                {algorithm?.is_official && ' (Official)'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm">
                {(hideAdsCompletely || maxAdsToShow === 0) 
                  ? `Showing ${adsStats.totalPosts} posts • All ads disabled`
                  : `Showing ${adsStats.totalPosts} posts with ${adsStats.totalAds} ads`
                }
              </div>
              <Button 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => router.push('/algorithms')}
              >
                Change algorithm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}