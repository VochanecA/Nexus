// components/feed/public-feed.tsx - MODERNI STIL SA OPTIMIZOVANIM SLIKAMA
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
  Hash,
  Flame,
  Search,
  Bell,
  Menu,
  Home,
  LogIn,
  UserPlus,
  Globe,
  X,
  Settings,
  Moon,
  Sun,
  Monitor,
  Image as ImageIcon,
  Eye,
  Clock,
  TrendingUp as TrendingUpIcon
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher, ThemeToggle } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

// ============ TYPE DEFINITIONS ============


// ============ TYPE DEFINITIONS ============

interface PostProvenance {
  version: string;
  authorId: string;
  timestamp: string;
  contentHash: string;
  signature: string;
  previousHash?: string;
  metadata: {
    isAIGenerated: boolean;
    originalPostId?: string;
    editOf?: string;
    repostChain?: string[];
    platform: string;
    algorithm: string;
    characterCount?: number;
    wordCount?: number;
    hasLinks?: boolean;
    hasHashtags?: boolean;
    client?: string;
  };
  verification?: {
    selfSigned: boolean;
    timestamped: boolean;
    hashChain: boolean;
  };
}

// components/post/post-card.tsx
export interface Post {
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
  views_count: number; // ← DODAJTE OVO
  user_has_liked: boolean;
  is_public?: boolean;
  impressions?: number;
  content_hash?: string;
  signature?: string;
  provenance?: PostProvenance;
  image_width?: number;
  image_height?: number;
  image_aspect_ratio?: number;
  is_ad?: boolean;
}
// Ostali tipovi ostaju isti...
interface EnhancedPost extends Post {
  engagement_score: number;
  time_score: number;
  is_trending: boolean;
  tags?: string[];
}




interface TrendingTopic {
  id: string;
  name: string;
  count: number;
  category: string;
  post_count: number;
}

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  postsToday: number;
  activeUsers: number;
}

// ============ CONSTANTS ============

const MOCK_TRENDING_TOPICS: TrendingTopic[] = [
  { id: "1", name: "Technology", count: 1245, category: "tech", post_count: 45 },
  { id: "2", name: "Web Development", count: 892, category: "tech", post_count: 32 },
  { id: "3", name: "AI News", count: 1567, category: "tech", post_count: 67 },
  { id: "4", name: "Open Source", count: 743, category: "tech", post_count: 28 },
  { id: "5", name: "Startup Culture", count: 621, category: "business", post_count: 19 },
];

// ============ HELPER FUNCTIONS ============

const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

const getOptimizedImageUrl = (url: string | null, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
}): string | null => {
  const normalizedUrl = normalizeImageUrl(url);
  
  if (!normalizedUrl) {
    return null;
  }

  // Ako je već puni URL
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }

  // Ako je relativni path
  if (normalizedUrl.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return baseUrl + normalizedUrl;
  }

  // Ako je Supabase storage path
  if (normalizedUrl.includes('/') && !normalizedUrl.includes('http')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/${normalizedUrl}`;
      
      // Dodaj query params za optimizaciju
      const { width = 800, height = 600, quality = 85, format = 'webp' } = options || {};
      return `${fullUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`;
    }
  }

  // DEVELOPMENT: Za test, vrati placeholder
  if (process.env.NODE_ENV === 'development') {
    return `https://picsum.photos/800/600?random=${Math.random()}`;
  }

  return normalizedUrl;
};

const extractHashtagsFromContent = (content: string): string[] => {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

const calculateEngagementScore = (post: Post): number => {
  const now = new Date();
  const postTime = new Date(post.created_at);
  const hoursSincePost = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60);
  
  const timeDecay = Math.exp(-hoursSincePost / 48);
  const likeWeight = 2;
  const commentWeight = 3;
  
  const engagement = (post.likes_count * likeWeight) + (post.comments_count * commentWeight);
  const recencyBoost = hoursSincePost < 2 ? 1.5 : 1;
  
  return engagement * timeDecay * recencyBoost;
};

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
      return enhancedPosts.sort((a, b) => {
        const scoreA = (a.engagement_score * 0.7) + (a.time_score * 0.0000003);
        const scoreB = (b.engagement_score * 0.7) + (b.time_score * 0.0000003);
        return scoreB - scoreA;
      });
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

const getInitials = (name: string): string => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// ============ COMPONENT STYLES ============

const ModernButton = ({ children, className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button 
    className={cn(
      "rounded-full transition-all duration-300 hover:shadow-lg",
      "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

const OutlineButton = ({ children, className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button 
    variant="outline"
    className={cn(
      "rounded-full border-gray-300 dark:border-gray-600",
      "hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400",
      "transition-all duration-300",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

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
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    onlineUsers: 0,
    postsToday: 0,
    activeUsers: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Refs for performance
  const statsCacheRef = useRef<Stats | null>(null);
  const postsCacheRef = useRef<Post[]>([]);

  // ============ DATA FETCHING ============

  const fetchStats = useCallback(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (statsCacheRef.current && lastUpdate > fiveMinutesAgo) {
      setStats(statsCacheRef.current);
      return;
    }

    setStatsLoading(true);
    const supabase = createClient();
    
    try {
      const [{ count: totalUsers }, { count: onlineUsers }, { count: postsToday }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true })
          .gte("last_seen", new Date(Date.now() - 15 * 60 * 1000).toISOString()),
        supabase.from("posts").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const { data: activeUsersData } = await supabase
        .from("posts")
        .select("user_id")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const activeUsersCount = new Set(activeUsersData?.map(post => post.user_id) || []).size;
      
      const newStats = {
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        postsToday: postsToday || 0,
        activeUsers: activeUsersCount || 0
      };
      
      setStats(newStats);
      statsCacheRef.current = newStats;
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({
        totalUsers: 2500000,
        onlineUsers: 45200,
        postsToday: 12400,
        activeUsers: 450000
      });
    } finally {
      setStatsLoading(false);
    }
  }, [lastUpdate]);

const fetchPosts = useCallback(async () => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  if (postsCacheRef.current.length > 0 && lastUpdate > twoMinutesAgo) {
    const sorted = sortPosts(postsCacheRef.current, sortAlgorithm);
    setActivePosts(sorted);
    setLoading(false);
    return;
  }

  setRefreshing(true);
  setError(null);
  const supabase = createClient();

  try {
    console.log('🚀 Public feed: Optimizovani dohvat sa subquery-ima...');

    // DODAJ views_count u SELECT query
    const { data: postsData, error: fetchError } = await supabase
      .from("posts")
      .select(`
        *,
        profiles!posts_user_id_fkey (
          username,
          display_name,
          avatar_url
        ),
        likes:likes(count),
        comments:comments(count)
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (fetchError) throw fetchError;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setActivePosts([]);
      setLoading(false);
      return;
    }

    // Formatiranje postova
    const formattedPosts: Post[] = postsData.map(post => {
      const likesCount = Array.isArray(post.likes) && post.likes[0] 
        ? post.likes[0].count 
        : 0;
      
      const commentsCount = Array.isArray(post.comments) && post.comments[0]
        ? post.comments[0].count
        : 0;

      return {
        id: post.id,
        content: post.content || '',
        image_url: normalizeImageUrl(post.image_url),
        created_at: post.created_at,
        user_id: post.user_id,
        username: post.profiles?.username || "anonymous",
        display_name: post.profiles?.display_name || "Anonymous User",
        avatar_url: normalizeImageUrl(post.profiles?.avatar_url),
        likes_count: likesCount,
        comments_count: commentsCount,
        // DODAJTE views_count OVDE
        views_count: post.views_count || 0,
        user_has_liked: false,
        impressions: post.views_count || Math.floor(Math.random() * 1000) + 100,
        provenance: post.provenance || undefined,
        content_hash: post.content_hash,
        signature: post.signature,
        image_width: post.image_width,
        image_height: post.image_height,
        image_aspect_ratio: post.image_aspect_ratio,
        is_public: post.is_public !== false
      };
    });

    console.log('📈 Public feed - Podaci sa views_count:', {
      ukupnoPostova: formattedPosts.length,
      ukupnoLajkova: formattedPosts.reduce((sum, post) => sum + post.likes_count, 0),
      ukupnoKomentara: formattedPosts.reduce((sum, post) => sum + post.comments_count, 0),
      ukupnoPregleda: formattedPosts.reduce((sum, post) => sum + (post.views_count || 0), 0)
    });

    setPosts(formattedPosts);
    postsCacheRef.current = formattedPosts;
    
    const sorted = sortPosts(formattedPosts, sortAlgorithm);
    setActivePosts(sorted);
    setLastUpdate(new Date());

    console.log('✅ Public feed: Dohvat sa views_count uspešan');

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error('❌ Public feed - Greška:', err);
    setError(errorMessage);
    
    if (postsCacheRef.current.length > 0) {
      const sorted = sortPosts(postsCacheRef.current, sortAlgorithm);
      setActivePosts(sorted);
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [sortAlgorithm, lastUpdate]);

  // ============ EVENT HANDLERS ============

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStats()]);
  }, [fetchPosts, fetchStats]);

  const toggleInsights = useCallback((postId: string) => {
    setShowInsights(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  // ============ EFFECTS ============

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPosts(), fetchStats()]);
    };
    loadData();
  }, [fetchPosts, fetchStats]);

  useEffect(() => {
    if (posts.length > 0) {
      const sortedPosts = sortPosts(posts, sortAlgorithm);
      setActivePosts(sortedPosts);
    }
  }, [sortAlgorithm, posts]);

  // ============ MEMOIZED VALUES ============

  const formatTimeSinceUpdate = useMemo(() => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, [lastUpdate]);

  // ============ RENDER COMPONENTS ============

  const renderLoadingSkeleton = () => (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
            <div className="h-6 w-24 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
          </div>
        </div>
      </header>
      
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6">
          <div className="hidden w-64 shrink-0 space-y-6 lg:block">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                <div className="h-10 animate-pulse rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
              </div>
            ))}
          </div>
          
          <div className="flex-1 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                </div>
                <div className="h-64 animate-pulse rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeader = () => (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold">Nexus</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 space-y-2" aria-label="Mobile navigation">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-full">
                    <Home className="h-5 w-5" />
                    Home
                  </Button>
                </Link>
                <Link href="/explore" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-full">
                    <Hash className="h-5 w-5" />
                    Explore
                  </Button>
                </Link>
                
                {/* Theme Switcher in Mobile Menu */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Settings className="h-3 w-3" />
                      Theme
                    </div>
                    <ThemeToggle />
                  </div>
                  
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                    <OutlineButton className="w-full justify-start gap-3 mb-2">
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </OutlineButton>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
                    <ModernButton className="w-full justify-start gap-3">
                      <UserPlus className="h-5 w-5" />
                      Register
                    </ModernButton>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 group-hover:from-blue-600 group-hover:to-purple-700 transition-all duration-300">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-xl font-bold tracking-tight sm:inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              nexus
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Desktop navigation">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link href="/explore" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Hash className="h-4 w-4" />
            Explore
          </Link>
          <Link href="/trending" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Flame className="h-4 w-4" />
            Trending
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher - Desktop */}
          <ThemeSwitcher variant="icon" size="sm" />

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block">
              <OutlineButton size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </OutlineButton>
            </Link>
            <Link href="/signup">
              <ModernButton size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </ModernButton>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className="border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              nexus
            </span>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Connecting people worldwide
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer links">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );

  const renderTrendingBadge = (post: EnhancedPost) => {
    if (!post.is_trending) return null;
    
    return (
      <Badge 
        variant="outline" 
        className="ml-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800"
      >
        <TrendingUpIcon className="h-3 w-3 mr-1 text-orange-600 dark:text-orange-400" />
        Trending
      </Badge>
    );
  };

  const renderAIBadge = (post: EnhancedPost) => {
    if (!post.provenance?.metadata?.isAIGenerated) return null;
    
    return (
      <Badge 
        variant="outline" 
        className="ml-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800"
      >
        <Sparkles className="h-3 w-3 mr-1 text-amber-600 dark:text-amber-400" />
        AI
      </Badge>
    );
  };

  // ============ RENDER LOGIC ============

  if (loading && !refreshing) {
    return renderLoadingSkeleton();
  }

  if (error === "database_not_setup") {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-2xl border border-destructive/20 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
              <Globe className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="mb-3 text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Setup Required
            </h1>
            <p className="mb-6 text-muted-foreground">
              Database tables need to be created. Run the SQL scripts in your Supabase project.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
                <OutlineButton>View Docs</OutlineButton>
              </Link>
              <ModernButton onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Again
              </ModernButton>
            </div>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
              <X className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="mb-3 text-2xl font-bold">Connection Error</h1>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <ModernButton onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </ModernButton>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {renderHeader()}

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 space-y-8">
              {/* User Stats */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {statsLoading ? (
                        <div className="h-8 w-20 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
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
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                      ) : (
                        formatNumber(stats.postsToday)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Online Now</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                      ) : (
                        formatNumber(stats.onlineUsers)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active This Week</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {statsLoading ? (
                        <div className="h-4 w-12 animate-pulse rounded bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
                      ) : (
                        formatNumber(stats.activeUsers)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Theme Section in Sidebar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">APPEARANCE</h3>
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <ThemeSwitcher variant="button" size="sm" className="w-full rounded-full" />
                </div>
              </div>

              {/* Auth Section in Sidebar */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">GET STARTED</h3>
                <div className="space-y-2">
                  <Link href="/login">
                    <OutlineButton className="w-full justify-start gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </OutlineButton>
                  </Link>
                  <Link href="/signup">
                    <ModernButton className="w-full justify-start gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Account
                    </ModernButton>
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Welcome Card */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="mb-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome to Nexus
                  </h1>
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/signup">
                      <ModernButton className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Join Free
                      </ModernButton>
                    </Link>
                    <Link href="/login">
                      <OutlineButton className="gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </OutlineButton>
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

            {/* Feed Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Latest Conversations</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {sortAlgorithm === 'mixed' 
                      ? 'Top posts mixed with latest' 
                      : sortAlgorithm === 'popular'
                      ? 'Most engaging posts first'
                      : 'Newest posts first'}
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    Updated {formatTimeSinceUpdate}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Sort Algorithm Selector */}
                <div className="flex rounded-full border border-gray-300 dark:border-gray-600 p-1 bg-background" role="radiogroup" aria-label="Sort posts by">
                  {(['latest', 'popular', 'mixed'] as const).map((algo) => (
                    <Button
                      key={algo}
                      variant={sortAlgorithm === algo ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortAlgorithm(algo)}
                      className={cn(
                        "rounded-full px-4",
                        sortAlgorithm === algo && "bg-gradient-to-r from-blue-500 to-purple-600"
                      )}
                      role="radio"
                      aria-checked={sortAlgorithm === algo}
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
                  className="gap-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={refreshing ? 'Refreshing feed' : 'Refresh feed'}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Posts Feed */}
            {activePosts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
                  <MessageSquare className="h-8 w-8 text-blue-500" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">No posts yet</h2>
                <div className="mb-4 text-muted-foreground">
                  {stats.postsToday > 0 
                    ? `Be the first today! ${formatNumber(stats.postsToday)} posts already shared.`
                    : 'Be the first to start a conversation'}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <ModernButton size="lg" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create First Post
                    </ModernButton>
                  </Link>
                  <Link href="/login">
                    <OutlineButton size="lg" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </OutlineButton>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activePosts.map((post) => (
                  <div key={post.id} className="space-y-6">
                    {/* Post Header with Badges */}
                    <div className="flex items-center gap-2">
                      {renderTrendingBadge(post)}
                      {renderAIBadge(post)}
                    </div>
                    
                    {/* Post Card */}
 <PostCard 
  post={post} 
  variant="minimal"
  compact={true}
  showFollowButton={true}
/>
                    
                    {/* Insights Toggle */}
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => toggleInsights(post.id)}
                        aria-expanded={!!showInsights[post.id]}
                        aria-label={showInsights[post.id] ? 'Hide post insights' : 'Show post insights'}
                      >
                        <Sparkles className="h-3 w-3" />
                        {showInsights[post.id] ? 'Hide Insights' : 'Show Insights'}
                        {post.engagement_score > 50 && (
                          <span className="ml-1 text-xs text-amber-500">🔥</span>
                        )}
                      </Button>
                    </div>
                    
                    {/* Insights Panel */}
                    {showInsights[post.id] && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <PostInsights post={post} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* CTA Section */}
            {activePosts.length > 0 && (
              <div className="mt-12 text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 px-4 py-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Join <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatNumber(stats.onlineUsers)}
                    </span> users online and <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatNumber(stats.activeUsers)}
                    </span> active this week
                  </span>
                  <Clock className="h-4 w-4 text-purple-500 ml-2" />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <ModernButton className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Join Nexus for Free
                    </ModernButton>
                  </Link>
                  <Link href="/login">
                    <OutlineButton className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </OutlineButton>
                  </Link>
                </div>
                
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  No credit card required • 30-day free trial • Cancel anytime
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {renderFooter()}
    </div>
  );
}