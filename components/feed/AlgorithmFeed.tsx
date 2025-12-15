// components/feed/AlgorithmFeed.tsx - SA KONTROLOM REKLAMA
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FeedGenerator } from '@/lib/feed-engine/generator';
import { PostCard } from '@/components/post/post-card';
import { AdPost } from '@/components/ads/AdPost';
import { ExplanationPanel } from './ExplanationPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Info, Settings, TrendingUp, Bell, Eye, EyeOff } from 'lucide-react';
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
import type { ScoredAd } from '@/lib/ads/ad-service';
import { Switch } from '@/components/ui/switch';

interface AlgorithmFeedProps {
  userId?: string;
  initialAlgorithm?: string;
  showExplanations?: boolean;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  is_public?: boolean;
  impressions?: number;
}

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
}

interface FeedItem {
  type: 'post' | 'ad';
  id: string;
  data: Post | ScoredAd;
}

const feedGenerator = new FeedGenerator();

const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
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
  };
};

export function AlgorithmFeed({ 
  userId, 
  initialAlgorithm,
  showExplanations = false 
}: AlgorithmFeedProps) {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [algorithm, setAlgorithm] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [showAllExplanations, setShowAllExplanations] = useState(showExplanations);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);
  
  // State-ovi za kontrolu reklama
  const [adsInterval, setAdsInterval] = useState<number>(5); // Default: na svakih 5 posta
  const [showAds, setShowAds] = useState<boolean>(true); // Da li prikazivati reklame
  const [maxAdsToShow, setMaxAdsToShow] = useState<number>(3); // Maksimalan broj reklama

  const supabase = createClient();

  /**
   * Kombinuj postove sa reklamama
   */
  const interleavePosPostsWithAds = useCallback((
    posts: Post[],
    ads: ScoredAd[],
    options?: {
      adsInterval?: number;
      maxAds?: number;
      skipFirst?: boolean;
      skipLast?: boolean;
      showAds?: boolean;
    }
  ): FeedItem[] => {
    const feed: FeedItem[] = [];
    
    // Opcije sa podrazumevanim vrednostima
    const {
      adsInterval = 5,
      maxAds = Math.ceil(posts.length / adsInterval),
      skipFirst = true,
      skipLast = true,
      showAds = true,
    } = options || {};
    
    // Ako su reklame isključene, vrati samo postove
    if (!showAds || ads.length === 0) {
      return posts.map(post => ({
        type: 'post',
        id: post.id,
        data: post
      }));
    }
    
    let adIndex = 0;
    let postsSinceLastAd = 0;
    let adsShown = 0;

    for (let postIndex = 0; postIndex < posts.length; postIndex++) {
      const post = posts[postIndex];
      
      // Dodaj post
      feed.push({
        type: 'post',
        id: post.id,
        data: post
      });
      
      postsSinceLastAd++;
      
      // Proveri da li je vreme za reklamu
      const shouldShowAd = (
        adIndex < ads.length &&
        adsShown < maxAds &&
        postsSinceLastAd >= adsInterval &&
        (!skipFirst || postIndex > 0) &&
        (!skipLast || postIndex < posts.length - 1)
      );
      
      if (shouldShowAd) {
        const ad = ads[adIndex];
        feed.push({
          type: 'ad',
          id: `ad-${ad.promoted_post.id}`,
          data: ad
        });
        
        adIndex++;
        adsShown++;
        postsSinceLastAd = 0;
      }
    }

    console.log(`📊 Feed stats: ${posts.length} posts, ${adsShown} ads shown (every ${adsInterval} posts, showAds: ${showAds})`);
    return feed;
  }, []);

  const fetchPostsWithImages = useCallback(async () => {
    try {
      console.log('🤖 ALGORITHM FEED: Direct fetch with JOIN');
      
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

      if (error) {
        console.error('Error fetching posts:', error);
        return [];
      }

      if (!postsWithProfiles) return [];

      const formattedPosts: Post[] = postsWithProfiles.map((post: any) => {
        const normalizedImageUrl = normalizeImageUrl(post.image_url);
        
        return {
          id: post.id,
          content: post.content,
          image_url: normalizedImageUrl,
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.profiles?.username || 'user',
          display_name: post.profiles?.display_name || 'User',
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        };
      });

      return formattedPosts;
    } catch (err) {
      console.error('Error in fetchPostsWithImages:', err);
      return [];
    }
  }, [supabase]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Učitaj postove
      const result = await feedGenerator.generateFeed({
        userId,
        algorithmSlug: initialAlgorithm,
        limit: 20,
        includeExplanations: showAllExplanations
      });
      
      setAlgorithm(result.algorithm);
      if (result.explanations) {
        setExplanations(result.explanations);
      }

      let posts: Post[] = [];
      if (result.posts && result.posts.length > 0) {
        const convertedPosts: Post[] = result.posts.map(convertPostDataToPost);
        const hasImages = convertedPosts.some((post: Post) => post.image_url);
        
        if (!hasImages) {
          const directPosts = await fetchPostsWithImages();
          posts = directPosts;
        } else {
          posts = convertedPosts;
        }
      } else {
        const directPosts = await fetchPostsWithImages();
        posts = directPosts;
      }

      // 2. Učitaj reklame samo ako su uključene
let ads: ScoredAd[] = [];
if (showAds && maxAdsToShow > 0) {
  try {
    const allAds = await adService.getRelevantAdsForUser(
      userId || null,
      20
    );
    
    // SHUFFLE reklama za varijaciju + limit
    const shuffledAds = [...allAds].sort(() => Math.random() - 0.5);
    ads = shuffledAds.slice(0, maxAdsToShow);
    
    console.log(`📢 Loaded ${ads.length}/${allAds.length} ads (shuffled)`);
  } catch (adError) {
    console.error('Error loading ads:', adError);
  }
}

      // 3. Kombinuj postove i reklame
      const combinedFeed = interleavePosPostsWithAds(posts, ads, {
        adsInterval,
        maxAds: ads.length,
        skipFirst: true,
        skipLast: true,
        showAds
      });
      
      setFeedItems(combinedFeed);

    } catch (error) {
      console.error('Error loading feed:', error);
      
      try {
        const directPosts = await fetchPostsWithImages();
        setFeedItems(directPosts.map(post => ({
          type: 'post',
          id: post.id,
          data: post
        })));
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, initialAlgorithm, showAllExplanations, fetchPostsWithImages, interleavePosPostsWithAds, adsInterval, showAds, maxAdsToShow]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const toggleExplanation = (postId: string) => {
    setActiveExplanation(activeExplanation === postId ? null : postId);
  };

  const toggleAllExplanations = () => {
    setShowAllExplanations(!showAllExplanations);
    if (!showAllExplanations) {
      loadFeed();
    }
  };

  const handleAdView = async (promotedPostId: string, userId: string | undefined) => {
    if (!userId) return;
    
    const adItem = feedItems.find(item => 
      item.type === 'ad' && (item.data as ScoredAd).promoted_post.id === promotedPostId
    );
    
    if (adItem && adItem.type === 'ad') {
      const ad = adItem.data as ScoredAd;
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'view',
        ad.explanation,
        ad.score
      );
    }
  };

  const handleAdLike = async (promotedPostId: string, userId: string | undefined) => {
    if (!userId) return;
    
    const adItem = feedItems.find(item => 
      item.type === 'ad' && (item.data as ScoredAd).promoted_post.id === promotedPostId
    );
    
    if (adItem && adItem.type === 'ad') {
      const ad = adItem.data as ScoredAd;
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'like',
        ad.explanation,
        ad.score
      );
    }
  };

  const handleAdFollow = async (promotedPostId: string, userId: string | undefined) => {
    if (!userId) return;
    
    const adItem = feedItems.find(item => 
      item.type === 'ad' && (item.data as ScoredAd).promoted_post.id === promotedPostId
    );
    
    if (adItem && adItem.type === 'ad') {
      const ad = adItem.data as ScoredAd;
      await adService.recordAdImpression(
        promotedPostId,
        userId,
        'follow',
        ad.explanation,
        ad.score
      );
    }
  };

  const handleAdsIntervalChange = (interval: number) => {
    setAdsInterval(interval);
    loadFeed();
  };

  const handleMaxAdsChange = (count: number) => {
    setMaxAdsToShow(count);
    loadFeed();
  };

  const toggleShowAds = () => {
    setShowAds(!showAds);
    // Feed će se automatski refreshovati zbog dependency-ja u loadFeed
  };

  // Izračunaj statistiku za prikaz
  const calculateAdsStats = () => {
    const totalPosts = feedItems.filter(item => item.type === 'post').length;
    const totalAds = feedItems.filter(item => item.type === 'ad').length;
    const adsPercentage = totalPosts > 0 ? ((totalAds / totalPosts) * 100).toFixed(1) : '0';
    
    return { totalPosts, totalAds, adsPercentage };
  };

  const adsStats = calculateAdsStats();

  if (loading && !refreshing) {
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
          {/* Kontrola za reklame - Dodajte ovo u header */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <Bell className="h-4 w-4 text-muted-foreground" />
            
            {/* Switch za uključivanje/isključivanje reklama */}
            <div className="flex items-center gap-2">
              {showAds ? (
                <Eye className="h-4 w-4 text-green-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
              <Switch
                checked={showAds}
                onCheckedChange={toggleShowAds}
                className="scale-90"
              />
            </div>
            
            {/* Kontrole samo ako su reklame uključene */}
            {showAds && (
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

      {/* Statistika reklama */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span>Feed stats:</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>{adsStats.totalPosts} posts</span>
          {showAds && (
            <>
              <span>{adsStats.totalAds} ads</span>
              <span>{adsStats.adsPercentage}% ad density</span>
              <span>Interval: every {adsInterval} posts</span>
              <span>Max: {maxAdsToShow} ads</span>
            </>
          )}
          {!showAds && (
            <span className="text-green-600 font-medium">✓ Ads disabled</span>
          )}
        </div>
      </div>

      {/* Feed Items */}
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
            <div key={item.id} className="space-y-4">
              {/* Indikator za reklame */}
              {item.type === 'ad' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Sponsored • Ad #{index + 1} in feed</span>
                </div>
              )}
              
              {/* Render Post or Ad */}
              {item.type === 'ad' ? (
                <AdPost
                  promotedPostId={(item.data as ScoredAd).promoted_post.id}
                  postData={(item.data as ScoredAd).post_data}
                  explanation={(item.data as ScoredAd).explanation}
                  onView={() => handleAdView((item.data as ScoredAd).promoted_post.id, userId)}
                  onLike={() => handleAdLike((item.data as ScoredAd).promoted_post.id, userId)}
                  onFollow={() => handleAdFollow((item.data as ScoredAd).promoted_post.id, userId)}
                />
              ) : (
                <div className="relative">
                  <PostCard post={item.data as Post} />
                  
                  {/* Explanation toggle button */}
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
              
              {/* Explanation Panel for regular posts */}
              {item.type === 'post' && showAllExplanations && activeExplanation === item.id && (
                <div className="ml-8">
                  <ExplanationPanel
                    postId={item.id}
                    explanation={explanations[item.id]}
                    onClose={() => setActiveExplanation(null)}
                  />
                </div>
              )}
              
              {/* Mini explanation summary for regular posts */}
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
                {showAds 
                  ? `Showing ${adsStats.totalPosts} posts with ${adsStats.totalAds} ads`
                  : `Showing ${adsStats.totalPosts} posts (ads disabled)`
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