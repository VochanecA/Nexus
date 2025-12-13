// app/trending/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Alert, 
  AlertDescription 
} from "@/components/ui/alert";
import { 
  AlertCircle, 
  Users, 
  Plus, 
  Pencil, 
  Sparkles, 
  Settings, 
  Info, 
  Brain, 
  Clock, 
  Zap, 
  Heart, 
  Shield,
  Menu,
  Home,
  Hash,
  Search,
  ArrowRight,
  TrendingUp,
  Flame,
  UserCheck,
  UserPlus,
  BarChart3,
  TrendingUp as TrendingIcon,
  Zap as HotIcon,
  Clock as NewIcon,
  MessageSquare,
  Eye
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ProvenanceService } from '@/lib/provenance/provenance';

// Import feed engine components
import { 
  Feed as BaseFeed, 
  AlgorithmFeed 
} from "@/components/feed";

// Import cache functions
// import { setCachedPosts } from '@/lib/redis/cache';
import { getCachedPosts, setCachedPosts, invalidateCache } from '@/lib/cache';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string;
  created_at: string;
}

interface FeedAlgorithm {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_official: boolean;
  is_public: boolean;
  version: string;
  algorithm_config: Record<string, unknown>;
  signal_descriptions: Record<string, unknown>;
  weight_config: Record<string, unknown>;
  install_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  followingCount: number;
  followerCount: number;
}

interface TrendingPost {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: Profile;
  likes_count: number;
  comments_count: number;
  views_count: number;
  engagement_rate: number;
  trend_score: number;
}

// Helper funkcije
const detectAIContent = (content: string): boolean => {
  const aiIndicators = [
    /as an ai language model/gi,
    /i am an ai/gi,
    /i cannot.*because/gi,
    /based on.*training data/gi,
    /my knowledge cutoff/gi,
    /i don[']?t have real-time/gi,
    /as a language model/gi
  ];
  
  let score = 0;
  aiIndicators.forEach(pattern => {
    if (pattern.test(content)) score++;
  });
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = content.length / Math.max(sentences.length, 1);
  
  if (sentences.length > 5 && avgSentenceLength > 50) {
    score += 0.5;
  }
  
  const aiPhrases = [
    'in summary',
    'to conclude',
    'furthermore',
    'additionally',
    'it is important to note',
    'this highlights',
    'it demonstrates'
  ];
  
  aiPhrases.forEach(phrase => {
    if (content.toLowerCase().includes(phrase)) {
      score += 0.2;
    }
  });
  
  return score >= 1.5;
};

export default function TrendingPage(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ followingCount: 0, followerCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [showFollowButtons, setShowFollowButtons] = useState(true);
  const [trendingTab, setTrendingTab] = useState<'hot' | 'new' | 'top'>('hot');
  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  const supabase = createClient();

  const fetchUserData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();
        
        if (userProfile) {
          setProfile({
            id: userProfile.id,
            display_name: userProfile.display_name,
            avatar_url: userProfile.avatar_url,
            bio: userProfile.bio,
            username: userProfile.username || 'user',
            created_at: userProfile.created_at,
          });
        }

        const [followingsResponse, followersResponse] = await Promise.all([
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUser.id),
          supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", currentUser.id)
        ]);

        const followingIds = followingsResponse.data?.map(follow => follow.following_id) || [];
        const followerCount = followersResponse.data?.length || 0;

        setFollowingUserIds([...followingIds, currentUser.id]);
        setUserStats({
          followingCount: Math.max(0, followingIds.length),
          followerCount
        });

        const { error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        
        if (profileError?.message?.includes("Could not find the table")) {
          setDatabaseError("database_not_setup");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchTrendingPosts = useCallback(async (tab: 'hot' | 'new' | 'top'): Promise<void> => {
    setTrendingLoading(true);
    try {
      // In production, you would calculate trend_score based on:
      // - Likes, comments, shares recency-weighted
      // - View velocity
      // - Author reputation
      // - Time decay factor
      
      // For now, fetch posts with engagement metrics
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate trend scores
      const now = new Date();
      const postsWithScores: TrendingPost[] = (postsData || []).map((post: any) => {
        const postDate = new Date(post.created_at);
        const hoursSincePost = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
        
        // Mock engagement data (in production, fetch from likes/comments tables)
        const likes = Math.floor(Math.random() * 1000);
        const comments = Math.floor(Math.random() * 100);
        const views = Math.floor(Math.random() * 5000);
        
        // Calculate trend score based on tab
        let trendScore = 0;
        const baseScore = (likes * 2) + (comments * 3) + (views * 0.1);
        
        switch (tab) {
          case 'hot':
            // Hot: Recent posts with high velocity
            const velocity = (likes + comments) / Math.max(hoursSincePost, 1);
            trendScore = baseScore * velocity;
            break;
          case 'new':
            // New: Mostly chronological, slight engagement boost
            trendScore = 1000000 - hoursSincePost; // Recent posts first
            break;
          case 'top':
            // Top: All-time best
            trendScore = baseScore;
            break;
        }
        
        // Apply time decay for hot/top
        if (tab !== 'new') {
          const decayFactor = Math.exp(-hoursSincePost / 24); // 24-hour half-life
          trendScore *= decayFactor;
        }

        return {
          id: post.id,
          content: post.content,
          user_id: post.user_id,
          created_at: post.created_at,
          profiles: post.profiles,
          likes_count: likes,
          comments_count: comments,
          views_count: views,
          engagement_rate: ((likes + comments) / Math.max(views, 1)) * 100,
          trend_score: trendScore
        };
      });

      // Sort by trend score
      const sortedPosts = postsWithScores.sort((a, b) => b.trend_score - a.trend_score);
      setTrendingPosts(sortedPosts.slice(0, 25));
      
    } catch (error) {
      console.error("Error fetching trending posts:", error);
    } finally {
      setTrendingLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    void fetchTrendingPosts(trendingTab);
  }, [trendingTab, fetchTrendingPosts]);

  const handleFollowChange = useCallback((userId: string, isFollowing: boolean): void => {
    if (isFollowing) {
      setFollowingUserIds(prev => [...prev, userId]);
    } else {
      setFollowingUserIds(prev => prev.filter(id => id !== userId));
    }
    
    void fetchUserData();
  }, [fetchUserData]);

  const handleCreatePost = async (): Promise<void> => {
    if (!user || !postContent.trim()) return;

    setPosting(true);
    setPostError(null);

    try {
      const isAIGenerated = detectAIContent(postContent.trim());
      
      const provenance = await ProvenanceService.signPost(
        '',
        user.id,
        postContent.trim(),
        {
          isAIgenerated: isAIGenerated,
        }
      );

      const { error, data } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: postContent.trim(),
          content_hash: provenance.contentHash,
          signature: provenance.signature,
          provenance: provenance
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const updatedProvenance = await ProvenanceService.signPost(
          data.id,
          user.id,
          postContent.trim(),
          {
            isAIgenerated: detectAIContent(postContent.trim()),
          }
        );
        
        await supabase
          .from("posts")
          .update({
            provenance: updatedProvenance,
            signature: updatedProvenance.signature
          })
          .eq('id', data.id);
      }

      setPostContent("");
      setCharacterCount(0);
      setCreatePostDialogOpen(false);
      
      await fetchUserData();
      await fetchTrendingPosts(trendingTab); // Refresh trending after new post
      
      await setCachedPosts('algorithm', []);
      await setCachedPosts('following', []);
      await setCachedPosts('chronological', []);
      
      window.dispatchEvent(new Event('feedRefresh'));
      
    } catch (error) {
      console.error("Error creating post:", error);
      setPostError(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const content = e.target.value;
    setPostContent(content);
    setCharacterCount(content.length);
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderLoadingState = (): React.JSX.Element => (
    <div className="min-h-screen bg-background">
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

  const renderDatabaseErrorState = (): React.JSX.Element => (
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
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-3 text-2xl font-bold">Setup Required</h2>
          <p className="mb-6 text-muted-foreground">
            Database tables need to be created. Run the SQL scripts in your Supabase project.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View Docs</Button>
            </Link>
            <Button onClick={() => window.location.reload()} variant="secondary">
              <Sparkles className="mr-2 h-4 w-4" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  if (databaseError === "database_not_setup") {
    return renderDatabaseErrorState();
  }

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
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
                  <Link href="/algorithms">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Brain className="h-5 w-5" />
                      Algorithms
                    </Button>
                  </Link>
                  <Link href="/trending">
                    <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10">
                      <Flame className="h-5 w-5" />
                      Trending
                    </Button>
                  </Link>
                  <div className="pt-4">
                    <Link href="/algorithms/create" className="w-full">
                      <Button className="w-full">Create Algorithm</Button>
                    </Link>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-xl font-bold tracking-tight sm:inline">
                nexus trending
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="/explore" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Hash className="h-4 w-4" />
              Explore
            </Link>
            <Link href="/algorithms" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Brain className="h-4 w-4" />
              Algorithms
            </Link>
            <Link href="/trending" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Flame className="h-4 w-4" />
              Trending
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search - desktop only */}
            <div className="hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Trending"
                  className="w-48 pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
              </Dialog>
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Following Count */}
                  <button
                    type="button"
                    onClick={() => setShowFollowersModal(true)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {userStats.followingCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </button>
                  
                  {/* Followers Count */}
                  <button
                    type="button"
                    onClick={() => setShowFollowersModal(true)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {userStats.followerCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                  </button>
                </div>
                
                {/* Trending Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Trending Algorithm</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Posts are ranked based on engagement velocity, recency, and overall popularity.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setTrendingTab('hot')}
                  >
                    <Flame className="h-4 w-4" />
                    View Hot Posts
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">TRENDING FILTERS</h3>
                <div className="space-y-2">
                  <Button 
                    variant={trendingTab === 'hot' ? 'default' : 'outline'}
                    onClick={() => setTrendingTab('hot')}
                    className="w-full justify-start gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    Hot (Now Trending)
                  </Button>
                  <Button 
                    variant={trendingTab === 'new' ? 'default' : 'outline'}
                    onClick={() => setTrendingTab('new')}
                    className="w-full justify-start gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    New & Rising
                  </Button>
                  <Button 
                    variant={trendingTab === 'top' ? 'default' : 'outline'}
                    onClick={() => setTrendingTab('top')}
                    className="w-full justify-start gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Top (All Time)
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Tabs */}
            <div className="lg:hidden mb-6">
              <Tabs 
                value={trendingTab} 
                onValueChange={(value) => setTrendingTab(value as typeof trendingTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hot" className="gap-2">
                    <Flame className="h-4 w-4" />
                    <span className="hidden sm:inline">Hot</span>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">New</span>
                  </TabsTrigger>
                  <TabsTrigger value="top" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Top</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Welcome Card */}
            <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-r from-orange-500/5 via-red-500/5 to-pink-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-6 w-6 text-orange-500" />
                    <h2 className="text-2xl font-bold">Trending Now</h2>
                  </div>
                  <p className="mb-4 text-muted-foreground">
                    Discover what's hot and happening across Nexus. Posts are ranked based on engagement velocity and popularity.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      onClick={() => setTrendingTab('hot')}
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      View Hot Posts
                    </Button>
                    <Link href="/explore">
                      <Button variant="outline">Explore Topics</Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20">
                    <TrendingIcon className="h-12 w-12 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {trendingTab === 'hot' && <><Flame className="h-5 w-5" /> Hot Posts</>}
                  {trendingTab === 'new' && <><Zap className="h-5 w-5" /> Rising Posts</>}
                  {trendingTab === 'top' && <><TrendingUp className="h-5 w-5" /> Top Posts</>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {trendingTab === 'hot' && 'Posts gaining popularity right now'}
                  {trendingTab === 'new' && 'Fresh posts with early engagement'}
                  {trendingTab === 'top' && 'All-time most popular posts'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant={trendingTab === 'hot' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrendingTab('hot')}
                    className="gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    Hot
                  </Button>
                  <Button
                    variant={trendingTab === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrendingTab('new')}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    New
                  </Button>
                  <Button
                    variant={trendingTab === 'top' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrendingTab('top')}
                    className="gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Top
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="follow-buttons"
                    checked={showFollowButtons}
                    onCheckedChange={setShowFollowButtons}
                  />
                  <Label htmlFor="follow-buttons" className="text-sm whitespace-nowrap">
                    Follow buttons
                  </Label>
                </div>
              </div>
            </div>

            {/* Trending Posts */}
            <div className="space-y-4">
              {trendingLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))
              ) : trendingPosts.length === 0 ? (
                <div className="rounded-xl border p-8 text-center">
                  <Flame className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No trending posts yet</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Be the first to create engaging content!
                  </p>
                  <Button 
                    className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    onClick={() => setCreatePostDialogOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Create Post
                  </Button>
                </div>
              ) : (
                trendingPosts.map((post, index) => (
                  <div 
                    key={post.id} 
                    className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      {/* Trend Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`
                              ${index === 0 ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : ''}
                              ${index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : ''}
                              ${index === 2 ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : ''}
                            `}
                          >
                            {index === 0 && <Flame className="h-3 w-3 mr-1" />}
                            #{index + 1} Trending
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Follow Button */}
                        {showFollowButtons && user && post.user_id !== user.id && (
                          <Button
                            size="sm"
                            variant={followingUserIds.includes(post.user_id) ? "outline" : "default"}
                            onClick={() => handleFollowChange(post.user_id, !followingUserIds.includes(post.user_id))}
                          >
                            {followingUserIds.includes(post.user_id) ? 'Following' : 'Follow'}
                          </Button>
                        )}
                      </div>

                      {/* Post Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={post.profiles.avatar_url ?? undefined} 
                            alt={post.profiles.display_name ?? 'User'} 
                          />
                          <AvatarFallback>
                            {getInitials(post.profiles.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <Link 
                              href={`/profile/${post.profiles.username}`}
                              className="font-medium hover:text-primary"
                            >
                              {post.profiles.display_name || post.profiles.username}
                            </Link>
                            {post.trend_score > 5000 && (
                              <Badge variant="outline" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Viral
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{post.profiles.username}
                          </p>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                      </div>

                      {/* Engagement Metrics */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{post.likes_count}</span>
                            <span className="text-xs text-muted-foreground">likes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{post.comments_count}</span>
                            <span className="text-xs text-muted-foreground">comments</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{post.views_count}</span>
                            <span className="text-xs text-muted-foreground">views</span>
                          </div>
                        </div>
                        
                        {/* Engagement Rate */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {post.engagement_rate.toFixed(1)}% engagement
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Trend score: {Math.round(post.trend_score)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load More */}
            <div className="mt-8 text-center">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => fetchTrendingPosts(trendingTab)}
                disabled={trendingLoading}
              >
                {trendingLoading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Trending
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Trending & Info */}
          <aside className="hidden w-80 flex-shrink-0 xl:block">
            <div className="sticky top-24 space-y-6">
              {/* Search - Desktop */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search trending topics"
                  className="pl-9"
                />
              </div>

              {/* Trending Topics */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Trending Topics
                </h3>
                <div className="space-y-3">
                  {['AI', 'Technology', 'Science', 'Programming', 'Design', 'Startups', 'Web3', 'Open Source'].map((topic, i) => (
                    <div key={topic} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          #{i + 1}
                        </Badge>
                        <span className="font-medium">#{topic}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 1000) + 100} posts
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Stats */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Trending Insights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Hot Posts Velocity</span>
                      <span className="font-medium">
                        {trendingPosts.length > 0 ? Math.round(trendingPosts[0]?.trend_score / 100) : 0}/sec
                      </span>
                    </div>
                    <Progress value={trendingPosts.length > 0 ? Math.min(100, trendingPosts[0]?.trend_score / 100) : 0} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg. Engagement</p>
                      <p className="text-lg font-bold">
                        {trendingPosts.length > 0 
                          ? Math.round(trendingPosts.reduce((acc, post) => acc + post.engagement_rate, 0) / trendingPosts.length)
                          : 0}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">New Posts/hr</p>
                      <p className="text-lg font-bold">
                        {Math.floor(Math.random() * 50) + 10}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
                <div className="mb-4">
                  <Flame className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Go Viral!</h3>
                <p className="mb-4 text-sm text-orange-100">
                  Create engaging content to appear in trending
                </p>
                <Button 
                  className="w-full bg-white text-orange-600 hover:bg-gray-100"
                  size="lg"
                  onClick={() => setCreatePostDialogOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Create Post Dialog */}
      <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Create Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={profile?.avatar_url ?? undefined} 
                  alt={profile?.display_name ?? "User"} 
                />
                <AvatarFallback>
                  {getInitials(profile?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="What's trending?"
                  value={postContent}
                  onChange={handleContentChange}
                  className="min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-lg"
                  maxLength={280}
                  disabled={posting}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {characterCount}/280 characters
                {characterCount > 250 && (
                  <span className="ml-2 text-orange-500">
                    {280 - characterCount} left
                  </span>
                )}
              </div>
              <Badge 
                variant={characterCount > 280 ? "destructive" : "secondary"}
                className={characterCount > 250 ? "bg-orange-500" : ""}
              >
                {characterCount > 280 ? "Too long!" : "Good"}
              </Badge>
            </div>
            
            {postError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{postError}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreatePostDialogOpen(false)}
                disabled={posting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreatePost()}
                disabled={posting || !postContent.trim() || characterCount > 280}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {posting ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user?.id}
        username={profile?.username}
        followingCount={userStats.followingCount}
        followerCount={userStats.followerCount}
        supabase={supabase}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Hash className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </Link>
          <button 
            type="button"
            className="flex flex-col items-center gap-1 p-2 text-orange-500"
            aria-label="Trending"
          >
            <Flame className="h-5 w-5" />
            <span className="text-xs">Trending</span>
          </button>
          <Link href="/algorithms" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Brain className="h-5 w-5" />
            <span className="text-xs">Algorithms</span>
          </Link>
          <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
                aria-label="Create post"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Post</span>
              </button>
            </DialogTrigger>
          </Dialog>
        </div>
      </nav>
      <div className="pb-16 lg:pb-0" />

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">nexus trending</span>
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Discover what's hot
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/algorithms" className="text-sm text-muted-foreground hover:text-foreground">
                Algorithms
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
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

// Komponenta za prikaz followera (kopirano iz home/page.tsx)
interface FollowerProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isFollowing: boolean;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  username?: string;
  followingCount: number;
  followerCount: number;
  supabase: ReturnType<typeof createClient>;
}

function FollowersModal({
  isOpen,
  onClose,
  userId,
  username,
  followingCount,
  followerCount,
  supabase
}: FollowersModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [following, setFollowing] = useState<FollowerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const [followerIdsData, followingIdsData] = await Promise.all([
        supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
      ]);

      if (followerIdsData.error) throw new Error(followerIdsData.error.message);
      if (followingIdsData.error) throw new Error(followingIdsData.error.message);

      const followerIds = followerIdsData.data?.map(f => f.follower_id) || [];
      const followingIds = followingIdsData.data?.map(f => f.following_id) || [];

      let followerProfiles: FollowerProfile[] = [];
      let followingProfiles: FollowerProfile[] = [];

      if (followerIds.length > 0) {
        const { data: followersProfilesData, error: followersProfilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", followerIds);

        if (followersProfilesError) throw new Error(followersProfilesError.message);

        const { data: myFollowingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", followerIds);

        const followingIdsSet = new Set(myFollowingData?.map(f => f.following_id) || []);

        followerProfiles = (followersProfilesData || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          isFollowing: followingIdsSet.has(profile.id)
        }));
      }

      if (followingIds.length > 0) {
        const { data: followingProfilesData, error: followingProfilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", followingIds);

        if (followingProfilesError) throw new Error(followingProfilesError.message);

        followingProfiles = (followingProfilesData || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          isFollowing: true
        }));
      }

      setFollowers(followerProfiles);
      setFollowing(followingProfiles);
    } catch (err) {
      console.error("Error fetching followers:", err);
      setError(err instanceof Error ? err.message : "Failed to load followers");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      void fetchFollowers();
    }
  }, [isOpen, userId, fetchFollowers]);

  const handleFollowToggle = async (profileId: string, currentlyFollowing: boolean): Promise<void> => {
    if (!userId) return;

    try {
      if (currentlyFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", profileId);
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: userId,
            following_id: profileId
          });
      }

      await fetchFollowers();
    } catch (err) {
      console.error("Error toggling follow:", err);
      setError("Failed to update follow status");
    }
  };

  const currentData = activeTab === 'followers' ? followers : following;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {username ? `${username}'s Connections` : 'Your Connections'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === 'followers' ? 'default' : 'outline'}
              onClick={() => setActiveTab('followers')}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Followers ({followerCount})
            </Button>
            <Button
              variant={activeTab === 'following' ? 'default' : 'outline'}
              onClick={() => setActiveTab('following')}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Following ({followingCount})
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : currentData.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {activeTab === 'followers' 
                  ? 'When people follow you, they will appear here.'
                  : 'Start following people to see their posts in your feed.'}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {currentData.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <Link 
                      href={`/profile/${profile.username}`}
                      className="flex items-center gap-3 flex-1"
                      onClick={onClose}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name ?? 'User'} />
                        <AvatarFallback>
                          {profile.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium truncate">
                            {profile.display_name || profile.username}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        {profile.bio && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </Link>

                    {userId && profile.id !== userId && (
                      <Button
                        size="sm"
                        variant={profile.isFollowing ? "outline" : "default"}
                        onClick={() => handleFollowToggle(profile.id, profile.isFollowing)}
                        className="whitespace-nowrap"
                      >
                        {profile.isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dodajemo RefreshCw ikonu koja nedostaje
const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);