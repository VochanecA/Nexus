// components/feed/public-feed.tsx - COMPLETE TYPE-SAFE VERSION
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/post/post-card";
import { PostInsights } from "@/components/post/post-insights";
import { ConversationStarter } from "@/components/post/conversation-starter";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Users, 
  MessageSquare, 
  Globe,
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
  Hash,
  Flame,
  Search,
  Bell,
  Menu,
  Home
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ============ TYPE DEFINITIONS ============

// Core Post Interface (matches PostCard)
interface Post {
  id: string;
  content: string;
  image_url: string | null ; // STRING OR NULL, NOT UNDEFINED
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

// Enhanced Post with algorithm scores
interface EnhancedPost extends Post {
  engagement_score: number;
  time_score: number;
  is_trending: boolean;
  tags?: string[];
}

// Trending Topic
interface TrendingTopic {
  id: string;
  name: string;
  count: number;
  category: string;
  post_count: number;
}

// Stats
interface Stats {
  totalUsers: number;
  onlineUsers: number;
  postsToday: number;
  activeUsers: number;
}

// Supabase Response Types
interface SupabasePost {
  id: string;
  content: string;
  image_url: string | null | undefined; // Supabase can return undefined
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// ============ CONSTANTS ============

const MOCK_TRENDING_TOPICS: TrendingTopic[] = [
  { id: "1", name: "Technology", count: 1245, category: "tech", post_count: 45 },
  { id: "2", name: "Web Development", count: 892, category: "tech", post_count: 32 },
  { id: "3", name: "AI News", count: 1567, category: "tech", post_count: 67 },
  { id: "4", name: "Open Source", count: 743, category: "tech", post_count: 28 },
  { id: "5", name: "Startup Culture", count: 621, category: "business", post_count: 19 },
  { id: "6", name: "Programming", count: 542, category: "tech", post_count: 41 },
  { id: "7", name: "Design", count: 487, category: "creative", post_count: 23 },
  { id: "8", name: "Finance", count: 398, category: "business", post_count: 17 },
  { id: "9", name: "Health", count: 312, category: "lifestyle", post_count: 14 },
  { id: "10", name: "Travel", count: 287, category: "lifestyle", post_count: 12 },
];

// ============ HELPER FUNCTIONS ============

// Convert undefined to null for image_url
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url;
};

// Extract hashtags from content
const extractHashtagsFromContent = (content: string): string[] => {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

// Calculate engagement score
const calculateEngagementScore = (post: Post): number => {
  const now = new Date();
  const postTime = new Date(post.created_at);
  const hoursSincePost = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60);
  
  // Exponential decay based on time (posts older than 48h get much lower score)
  const timeDecay = Math.exp(-hoursSincePost / 48);
  
  // Engagement weighting
  const likeWeight = 2;
  const commentWeight = 3;
  
  const engagement = (post.likes_count * likeWeight) + (post.comments_count * commentWeight);
  
  // Boost for very recent posts (first 2 hours)
  const recencyBoost = hoursSincePost < 2 ? 1.5 : 1;
  
  return engagement * timeDecay * recencyBoost;
};

// Sort posts with algorithm
const sortPosts = (
  posts: Post[], 
  algorithm: 'latest' | 'popular' | 'mixed' = 'mixed'
): EnhancedPost[] => {
  const enhancedPosts: EnhancedPost[] = posts.map(post => ({
    ...post,
    image_url: post.image_url,
    engagement_score: calculateEngagementScore(post),
    time_score: new Date(post.created_at).getTime(),
    is_trending: post.likes_count > 10 || post.comments_count > 5,
    tags: extractHashtagsFromContent(post.content)
  }));

  switch (algorithm) {
    case 'latest':
      return enhancedPosts.sort((a, b) => b.time_score - a.time_score);
    
    case 'popular':
      return enhancedPosts.sort((a, b) => b.engagement_score - a.engagement_score);
    
    case 'mixed':
    default:
      // Combination: 70% engagement, 30% recency
      return enhancedPosts.sort((a, b) => {
        const scoreA = (a.engagement_score * 0.7) + (a.time_score * 0.0000003);
        const scoreB = (b.engagement_score * 0.7) + (b.time_score * 0.0000003);
        return scoreB - scoreA;
      });
  }
};

// Analyze trending hashtags from posts
const analyzeTrendingHashtags = (posts: Post[]): TrendingTopic[] => {
  const hashtagCounts: Record<string, { count: number, posts: Set<string> }> = {};
  
  // Categories for hashtags
  const categoryMap: Record<string, string> = {
    // Tech related
    'technology': 'tech', 'tech': 'tech', 'programming': 'tech', 
    'coding': 'tech', 'webdev': 'tech', 'javascript': 'tech',
    'react': 'tech', 'nextjs': 'tech', 'typescript': 'tech',
    'ai': 'tech', 'machinelearning': 'tech', 'datascience': 'tech',
    'opensource': 'tech', 'software': 'tech', 'developer': 'tech',
    
    // Business
    'business': 'business', 'startup': 'business', 'entrepreneur': 'business',
    'finance': 'business', 'investing': 'business', 'marketing': 'business',
    'leadership': 'business', 'career': 'business', 'productivity': 'business',
    
    // Creative
    'design': 'creative', 'art': 'creative', 'photography': 'creative',
    'music': 'creative', 'writing': 'creative', 'film': 'creative',
    'creativity': 'creative', 'illustration': 'creative',
    
    // Lifestyle
    'health': 'lifestyle', 'fitness': 'lifestyle', 'travel': 'lifestyle',
    'food': 'lifestyle', 'fashion': 'lifestyle', 'selfcare': 'lifestyle',
    'wellness': 'lifestyle', 'mindfulness': 'lifestyle',
    
    // Gaming
    'gaming': 'gaming', 'esports': 'gaming', 'streaming': 'gaming',
    'games': 'gaming', 'pcgaming': 'gaming',
    
    // Education
    'learning': 'education', 'education': 'education', 'tutorial': 'education',
    'courses': 'education', 'knowledge': 'education',
    
    // Social
    'community': 'social', 'social': 'social', 'networking': 'social',
    'friends': 'social', 'connection': 'social',
  };

  // Count hashtags from all posts
  posts.forEach(post => {
    const hashtags = extractHashtagsFromContent(post.content);
    const uniqueHashtags = [...new Set(hashtags)];
    
    uniqueHashtags.forEach(tag => {
      if (!hashtagCounts[tag]) {
        hashtagCounts[tag] = { count: 0, posts: new Set() };
      }
      
      // Add post ID to set
      hashtagCounts[tag].posts.add(post.id);
      
      // Base points for hashtag (1 point per post)
      hashtagCounts[tag].count += 1;
      
      // Add engagement points from likes and comments
      const engagement = post.likes_count + (post.comments_count * 2);
      hashtagCounts[tag].count += engagement * 0.1;
      
      // Bonus for trending posts
      if (post.likes_count > 10 || post.comments_count > 5) {
        hashtagCounts[tag].count += 5;
      }
    });
  });

  // Convert to array and sort
  const trendingArray: TrendingTopic[] = Object.entries(hashtagCounts)
    .map(([name, data], index) => {
      const baseCategory = categoryMap[name] || 'general';
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      
      return {
        id: `${name}-${index}`,
        name: displayName,
        count: Math.round(data.count),
        category: baseCategory,
        post_count: data.posts.size
      };
    })
    .sort((a, b) => b.count - a.count);

  return trendingArray;
};

// Get posts by hashtag
const getPostsByHashtag = (posts: Post[], hashtag: string): Post[] => {
  const normalizedHashtag = hashtag.toLowerCase();
  return posts.filter(post => {
    const postHashtags = extractHashtagsFromContent(post.content);
    return postHashtags.includes(normalizedHashtag);
  });
};

// Format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

// ============ MAIN COMPONENT ============

export default function PublicFeed() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activePosts, setActivePosts] = useState<EnhancedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortAlgorithm, setSortAlgorithm] = useState<'latest' | 'popular' | 'mixed'>('mixed');
  const [showInsights, setShowInsights] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [showMockTrending, setShowMockTrending] = useState(false);
  const [lastTrendingUpdate, setLastTrendingUpdate] = useState<Date>(new Date());
  
  // Stats state
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    onlineUsers: 0,
    postsToday: 0,
    activeUsers: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // ============ DATA FETCHING ============

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const supabase = createClient();
    
    try {
      // 1. Total users
      const { count: totalUsersCount, error: totalUsersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      if (totalUsersError) throw totalUsersError;
      
      // 2. Online users (active in last 15 minutes)
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
      
      const { count: onlineUsersCount, error: onlineUsersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", fifteenMinutesAgo.toISOString());
      
      if (onlineUsersError) throw onlineUsersError;
      
      // 3. Posts today
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: postsTodayCount, error: postsTodayError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString())
        .lte("created_at", today.toISOString());
      
      if (postsTodayError) throw postsTodayError;
      
      // 4. Active users (posted in last 7 days)
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from("posts")
        .select("user_id")
        .gte("created_at", lastWeek.toISOString());
      
      if (activeUsersError) throw activeUsersError;
      
      const activeUsersCount = new Set(activeUsersData?.map(post => post.user_id)).size;
      
      setStats({
        totalUsers: totalUsersCount || 0,
        onlineUsers: onlineUsersCount || 0,
        postsToday: postsTodayCount || 0,
        activeUsers: activeUsersCount || 0
      });
      
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Fallback for development
      if (process.env.NODE_ENV === 'development') {
        setStats({
          totalUsers: 2500000,
          onlineUsers: 45200,
          postsToday: 12400,
          activeUsers: 450000
        });
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Format posts with counts - TYPE SAFE VERSION
  const formatPostsWithCounts = useCallback(async (postsData: SupabasePost[]): Promise<Post[]> => {
    const supabase = createClient();
    const postIds = postsData.map(p => p.id);
    
    try {
      // Batch queries for efficiency
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("likes")
          .select("post_id")
          .in("post_id", postIds),
        supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds)
      ]);

      const likesMap = (likesResult.data || []).reduce((acc: Record<string, number>, like) => {
        acc[like.post_id] = (acc[like.post_id] || 0) + 1;
        return acc;
      }, {});

      const commentsMap = (commentsResult.data || []).reduce((acc: Record<string, number>, comment) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {});

      return postsData.map(post => {
        // NORMALIZE IMAGE_URL - CONVERT UNDEFINED TO NULL
        const normalizedImageUrl = normalizeImageUrl(post.image_url);
        
        return {
          id: post.id,
          content: post.content,
          image_url: normalizedImageUrl, // NORMALIZED
          created_at: post.created_at,
          user_id: post.user_id,
          username: post.profiles?.username || "anonymous",
          display_name: post.profiles?.display_name || "Anonymous User",
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: likesMap[post.id] || 0,
          comments_count: commentsMap[post.id] || 0,
          user_has_liked: false,
        };
      });
    } catch (err) {
      console.error("Error formatting posts:", err);
      return [];
    }
  }, []);

  // Fetch trending data
  const fetchTrendingData = useCallback(async () => {
    if (posts.length === 0) return;
    
    setTrendingLoading(true);
    try {
      // Analyze hashtags from existing posts
      const realTrending = analyzeTrendingHashtags(posts);
      
      if (realTrending.length > 0) {
        // If we have real trending data, use it
        setTrendingTopics(realTrending.slice(0, 10)); // Top 10
        setShowMockTrending(false);
      } else {
        // If no real data, use mock
        setTrendingTopics(MOCK_TRENDING_TOPICS);
        setShowMockTrending(true);
      }
      
      setLastTrendingUpdate(new Date());
    } catch (err) {
      console.error("Error analyzing trending data:", err);
      setTrendingTopics(MOCK_TRENDING_TOPICS);
      setShowMockTrending(true);
    } finally {
      setTrendingLoading(false);
    }
  }, [posts]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    const supabase = createClient();
    setRefreshing(true);
    setError(null);

    try {
      // Fetch posts with profiles
      const { data: postsWithProfiles, error: fetchError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error("Error fetching posts:", fetchError);
        if (fetchError.message?.includes("Could not find the table")) {
          setError("database_not_setup");
        } else {
          setError(fetchError.message);
        }
        return;
      }

      if (!postsWithProfiles || postsWithProfiles.length === 0) {
        setPosts([]);
        setActivePosts([]);
        return;
      }

      // Format posts with counts - Type assertion for safety
      const formattedPosts = await formatPostsWithCounts(postsWithProfiles as SupabasePost[]);
      setPosts(formattedPosts);

      // Sort posts by selected algorithm
      const sortedPosts = sortPosts(formattedPosts, sortAlgorithm);
      setActivePosts(sortedPosts);

    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formatPostsWithCounts, sortAlgorithm]);

  // ============ EVENT HANDLERS ============

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStats()]);
  }, [fetchPosts, fetchStats]);

  const handleTrendingTopicClick = useCallback((topic: TrendingTopic) => {
    if (showMockTrending) {
      console.log("Sample trending topic clicked:", topic.name);
      return;
    }
    
    router.push(`/explore?hashtag=${topic.name.toLowerCase()}`);
  }, [router, showMockTrending]);

  const toggleInsights = useCallback((postId: string) => {
    setShowInsights(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  // ============ EFFECTS ============

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPosts(), fetchStats()]);
    };
    loadData();
  }, [fetchPosts, fetchStats]);

  // Resort when algorithm changes
  useEffect(() => {
    if (posts.length > 0) {
      const sortedPosts = sortPosts(posts, sortAlgorithm);
      setActivePosts(sortedPosts);
    }
  }, [sortAlgorithm, posts]);

  // Fetch trending when posts change
  useEffect(() => {
    if (posts.length > 0 && !loading) {
      fetchTrendingData();
    }
  }, [posts, loading, fetchTrendingData]);

  // Auto-refresh trending every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (posts.length > 0) {
        fetchTrendingData();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [posts.length, fetchTrendingData]);

  // ============ MEMOIZED VALUES ============

  const formatTimeSinceUpdate = useMemo(() => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastTrendingUpdate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, [lastTrendingUpdate]);

  // ============ RENDER FUNCTIONS ============

  const renderTrendingSection = useCallback(() => (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Trending Now</h3>
            <Flame className="h-4 w-4 text-orange-500" />
            {showMockTrending && (
              <Badge variant="outline" className="text-xs">
                Sample
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchTrendingData}
            disabled={trendingLoading || refreshing}
            className="h-7 w-7"
            title="Refresh trends"
          >
            <RefreshCw className={`h-3 w-3 ${trendingLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {trendingLoading && (
          <p className="text-xs text-muted-foreground mt-1">Analyzing trends...</p>
        )}
      </div>
      
      <div className="p-4">
        {trendingLoading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : trendingTopics.length === 0 ? (
          <div className="py-8 text-center">
            <Flame className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No trending topics yet</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to use hashtags!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {trendingTopics.map((topic) => {
                const hashtagPosts = showMockTrending ? [] : getPostsByHashtag(posts, topic.name);
                const sortedPosts = sortPosts(hashtagPosts, 'mixed');
                
                return (
                  <button
                    key={topic.id} 
                    className="group cursor-pointer space-y-1 rounded-lg p-3 transition-colors hover:bg-muted/50 w-full text-left"
                    onClick={() => handleTrendingTopicClick(topic)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium group-hover:text-primary">
                        #{topic.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {topic.post_count}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {topic.count} points
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Trending in {topic.category}
                      </p>
                      {!showMockTrending && sortedPosts.length > 0 && (
                        <span className="text-xs text-green-500">
                          Latest: {new Date(sortedPosts[0]?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    
                    {/* Progress bar showing popularity */}
                    {!showMockTrending && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                          style={{ 
                            width: `${Math.min(100, (topic.count / 100) * 100)}%` 
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Show top posts for this hashtag */}
                    {!showMockTrending && sortedPosts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dashed">
                        <p className="text-xs font-medium mb-2">Top posts:</p>
                        <div className="space-y-2">
                          {sortedPosts.slice(0, 2).map((post) => (
                            <div key={post.id} className="flex items-center gap-2 text-xs">
                              <div className="flex-1 truncate">
                                <span className="font-medium">{post.username}</span>: 
                                <span className="text-muted-foreground ml-1 truncate">
                                  {post.content.substring(0, 40)}...
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>❤️ {post.likes_count}</span>
                                <span>💬 {post.comments_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Info footer */}
            <div className="mt-4 pt-4 border-t">
              {showMockTrending ? (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500">•</span>
                    <span>Sample trending topics</span>
                  </div>
                  <span>Create posts with hashtags to see real trends</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-green-500" />
                    <span>Live trends from {posts.length} posts</span>
                  </div>
                  <span>Updated {formatTimeSinceUpdate}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              className="mt-4 w-full text-sm"
              onClick={() => {
                router.push('/explore');
              }}
            >
              Explore all trends
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  ), [
    fetchTrendingData, 
    trendingLoading, 
    refreshing, 
    showMockTrending, 
    trendingTopics, 
    posts, 
    getPostsByHashtag, 
    handleTrendingTopicClick, 
    formatTimeSinceUpdate, 
    router
  ]);

  // ============ RENDER LOGIC ============

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal header for loading */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </header>
        
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex gap-6">
            {/* Loading sidebar */}
            <div className="hidden w-64 flex-shrink-0 space-y-6 lg:block">
              <div className="space-y-4">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Loading posts */}
            <div className="flex-1 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Loading trending */}
            <div className="hidden w-80 flex-shrink-0 space-y-6 xl:block">
              <div className="space-y-4">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error === "database_not_setup") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Nexus</span>
            </div>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>
        
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Globe className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mb-3 text-2xl font-bold">Setup Required</h2>
            <p className="mb-6 text-muted-foreground">
              Database tables need to be created. Run the SQL scripts in your Supabase project.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="https://supabase.com/docs" target="_blank">
                <Button variant="outline">View Docs</Button>
              </Link>
              <Button onClick={handleRefresh} variant="secondary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Nexus</span>
            </div>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>
        
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="mb-3 text-2xl font-bold">Connection Error</h2>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Nexus</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 space-y-2">
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Home className="h-5 w-5" />
                      Home
                    </Button>
                  </Link>
                  <Link href="/explore">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Hash className="h-5 w-5" />
                      Explore
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <MessageSquare className="h-5 w-5" />
                      Messages
                    </Button>
                  </Link>
                  <div className="pt-4">
                    <Link href="/register" className="w-full">
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-xl font-bold tracking-tight sm:inline">
                nexus
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="/explore" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Hash className="h-4 w-4" />
              Explore
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              Notifications
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4" />
              Messages
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search - desktop only */}
            <div className="hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Nexus"
                  className="w-48 pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-24 space-y-8">
              {/* User Stats */}
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {statsLoading ? (
                        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                      ) : (
                        `${formatNumber(stats.totalUsers)}+`
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Posts Today</span>
                    <span className="font-medium">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                      ) : (
                        formatNumber(stats.postsToday)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Online Now</span>
                    <span className="font-medium">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                      ) : (
                        formatNumber(stats.onlineUsers)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active This Week</span>
                    <span className="font-medium">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                      ) : (
                        formatNumber(stats.activeUsers)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">QUICK ACTIONS</h3>
                <div className="space-y-2">
                  <Link href="/register">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create Account
                    </Button>
                  </Link>
                  <Link href="/explore">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Hash className="h-4 w-4" />
                      Explore Topics
                    </Button>
                  </Link>
                  <Link href="/trending">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Flame className="h-4 w-4" />
                      Trending Posts
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Tabs */}
            <div className="lg:hidden mb-6">
              <Tabs defaultValue="for-you" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="for-you" className="gap-2">
                    <Home className="h-4 w-4" />
                    For You
                  </TabsTrigger>
                  <TabsTrigger value="trending" className="gap-2">
                    <Flame className="h-4 w-4" />
                    Trending
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Welcome Card */}
            <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold">Welcome to Nexus</h2>
                  <div className="mb-4 text-muted-foreground">
                    {statsLoading ? (
                      <span>Loading community stats...</span>
                    ) : (
                      <>
                        Join <span className="font-semibold text-blue-500">{formatNumber(stats.onlineUsers)}</span> users online now 
                        and <span className="font-semibold text-purple-500">{formatNumber(stats.totalUsers)}</span> active members.
                      </>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Link href="/register">
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Join Free
                      </Button>
                    </Link>
                    <Link href="/explore">
                      <Button variant="outline">Explore</Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20">
                    <MessageSquare className="h-12 w-12 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Header with sort options */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Latest Conversations</h2>
                <p className="text-sm text-muted-foreground">
                  {sortAlgorithm === 'mixed' 
                    ? 'Top posts mixed with latest' 
                    : sortAlgorithm === 'popular'
                    ? 'Most engaging posts first'
                    : 'Newest posts first'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Sort Algorithm Selector */}
                <div className="flex rounded-lg border p-1 bg-background">
                  {(['latest', 'popular', 'mixed'] as const).map((algo) => (
                    <Button
                      key={algo}
                      variant={sortAlgorithm === algo ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortAlgorithm(algo)}
                      className="px-3"
                    >
                      {algo === 'latest' && '🕒 Latest'}
                      {algo === 'popular' && '🔥 Popular'}
                      {algo === 'mixed' && '🌟 Mixed'}
                    </Button>
                  ))}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Posts Feed with additional features */}
            {activePosts.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">No posts yet</h3>
                <div className="mb-4 text-muted-foreground">
                  {stats.postsToday > 0 
                    ? `Be the first today! ${formatNumber(stats.postsToday)} posts already shared.`
                    : 'Be the first to start a conversation'}
                </div>
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create First Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {activePosts.map((post) => (
                  <div key={post.id} className="space-y-4">
                    {/* Post Card - TYPE SAFE */}
                    <PostCard post={post} />
                    
                    {/* Insights toggle button */}
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => toggleInsights(post.id)}
                      >
                        <Sparkles className="h-3 w-3" />
                        {showInsights[post.id] ? 'Hide Insights' : 'Show Insights'}
                      </Button>
                    </div>
                    
                    {/* Post Insights */}
                    {showInsights[post.id] && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <PostInsights post={post} />
                      </div>
                    )}
                    
                    {/* Conversation Starter (only if post has enough engagement) */}
                    {(post.comments_count > 0 || post.likes_count > 5) && (
                      <div className="mt-2">
                        <ConversationStarter 
                          postId={post.id} 
                          postContent={post.content.substring(0, 200)} 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {activePosts.length > 0 && (
              <div className="mt-8 text-center">
                <div className="mb-4 text-sm text-muted-foreground">
                  Join {formatNumber(stats.onlineUsers)} users online and {formatNumber(stats.activeUsers)} active this week
                </div>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Join Nexus for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Sidebar - Trending & Info */}
          <aside className="hidden w-80 flex-shrink-0 xl:block">
            <div className="sticky top-24 space-y-6">
              {/* Search - Desktop */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search posts, people, topics"
                  className="pl-9"
                />
              </div>

              {/* Trending Topics - Updated section with real data */}
              {renderTrendingSection()}

              {/* Features */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-semibold">Why Join Nexus?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Real-time Updates</p>
                      <div className="text-sm text-muted-foreground">
                        {statsLoading ? 'Loading...' : `${formatNumber(stats.onlineUsers)} users online now`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                      <Shield className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Privacy Focused</p>
                      <div className="text-sm text-muted-foreground">
                        Your data stays yours. No tracking, no ads.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Growing Community</p>
                      <div className="text-sm text-muted-foreground">
                        {statsLoading ? 'Loading...' : `Join ${formatNumber(stats.totalUsers)}+ users sharing ideas daily`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white">
                <div className="mb-4">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Ready to dive in?</h3>
                <div className="mb-4 text-sm text-blue-100">
                  {statsLoading ? 'Loading...' : `Join ${formatNumber(stats.onlineUsers)} users online right now.`}
                </div>
                <Link href="/register">
                  <Button 
                    className="w-full bg-white text-blue-600 hover:bg-gray-100"
                    size="lg"
                  >
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2">
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Hash className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Bell className="h-5 w-5" />
            <span className="text-xs">Alerts</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Messages</span>
          </Link>
        </div>
      </nav>
      <div className="pb-16 lg:pb-0" />

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">nexus</span>
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Connecting people worldwide
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </Link>
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
                Blog
              </Link>
              <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
                Careers
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}