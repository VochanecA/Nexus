// app/explore/page.tsx
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
  MessageSquare,
  Eye,
  Tag,
  Filter,
  TrendingUp as TrendingIcon,
  Zap as HotIcon,
  Clock as NewIcon,
  Globe,
  Users as CommunityIcon,
  Rocket,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  Hash as HashIcon,
  Grid,
  List,
  LayoutGrid,
  Compass,
  Sparkle,
  Target,
  ArrowUpRight,
  Calendar,
  Star,
  ExternalLink,
  RefreshCw,
  X
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ProvenanceService } from '@/lib/provenance/provenance';

// Import feed engine components
import { 
  Feed as BaseFeed
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

interface Hashtag {
  id: string;
  name: string;
  category: string | null;
  total_mentions: number;
  total_posts: number;
  last_trending_at: string | null;
  created_at: string;
  updated_at: string;
  trending_score?: number;
  growth_rate?: number;
}

interface TopicCategory {
  id: string;
  name: string;
  icon: string;
  hashtags: Hashtag[];
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
  hashtags?: Hashtag[];
}

interface UserStats {
  followingCount: number;
  followerCount: number;
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

// Funkcija za ekstrakciju hashtagova iz teksta
const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[\p{L}\p{M}\p{N}_]+/gu;
  const matches = text.match(hashtagRegex) || [];
  return matches.map(tag => tag.slice(1).toLowerCase());
};

// Funkcija za linkovanje hashtagova u postovima
const linkHashtagsInContent = (content: string): React.ReactNode => {
  const parts = content.split(/(#[\p{L}\p{M}\p{N}_]+)/gu);
  
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const hashtagName = part.slice(1);
      return (
        <Link 
          key={index} 
          href={`/explore/${hashtagName}`}
          className="text-blue-500 hover:text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

export default function ExplorePage(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ followingCount: 0, followerCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [showFollowButtons, setShowFollowButtons] = useState(true);
  const [exploreTab, setExploreTab] = useState<'trending' | 'topics' | 'people' | 'algorithms'>('trending');
  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [savedHashtags, setSavedHashtags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [algorithmCategories, setAlgorithmCategories] = useState<any[]>([]);

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

        // Fetch algorithm categories for sidebar
        const { data: categoriesData } = await supabase
          .from("feed_algorithm_categories")
          .select("*")
          .order("name");

        if (categoriesData) {
          setAlgorithmCategories(categoriesData);
        }

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

  const fetchHashtags = useCallback(async (): Promise<void> => {
    setLoadingHashtags(true);
    try {
      // Prvo, proverimo da li hashtagovi postoje u bazi
      const { data: existingHashtags, error } = await supabase
        .from("hashtags")
        .select("*")
        .order("total_mentions", { ascending: false });

      if (error) {
        // Ako tabela ne postoji ili nema hashtagova, kreirajmo neke početne
        if (error.message.includes("relation") || error.message.includes("exist")) {
          console.log("Hashtags table might be empty, creating initial data...");
          setHashtags([]);
          return;
        }
        throw error;
      }

      if (existingHashtags && existingHashtags.length > 0) {
        // Ako imamo hashtagove, izračunajmo trending score
        const now = new Date();
        const hashtagsWithScores = existingHashtags.map((hashtag: any) => {
          const lastTrending = hashtag.last_trending_at ? new Date(hashtag.last_trending_at) : new Date(hashtag.created_at);
          const hoursSinceTrending = (now.getTime() - lastTrending.getTime()) / (1000 * 60 * 60);
          
          let trendingScore = (hashtag.total_mentions * 2) + hashtag.total_posts;
          const recencyBoost = Math.exp(-hoursSinceTrending / 48);
          trendingScore *= (1 + recencyBoost);
          
          const daysSinceCreation = (now.getTime() - new Date(hashtag.created_at).getTime()) / (1000 * 60 * 60 * 24);
          const avgDailyMentions = hashtag.total_mentions / Math.max(daysSinceCreation, 1);
          const growthRate = avgDailyMentions > 10 ? 0.2 : avgDailyMentions > 5 ? 0.1 : 0;
          
          return {
            ...hashtag,
            trending_score: trendingScore,
            growth_rate: growthRate
          };
        });

        setHashtags(hashtagsWithScores);
      } else {
        // Ako nema hashtagova, pokušajmo da ih ekstrahujemo iz postojećih postova
        await extractHashtagsFromExistingPosts();
      }
    } catch (error) {
      console.error("Error fetching hashtags:", error);
    } finally {
      setLoadingHashtags(false);
    }
  }, [supabase]);

  // Funkcija za ekstrakciju hashtagova iz postojećih postova
  const extractHashtagsFromExistingPosts = async (): Promise<void> => {
    try {
      console.log("Extracting hashtags from existing posts...");
      
      // Uzmi sve postove
      const { data: allPosts, error: postsError } = await supabase
        .from("posts")
        .select("id, content")
        .limit(100);

      if (postsError) throw postsError;

      if (allPosts && allPosts.length > 0) {
        const allHashtags = new Map<string, { count: number, postIds: string[] }>();
        
        // Ekstrahuj hashtagove iz svakog posta
        for (const post of allPosts) {
          const hashtagsInPost = extractHashtags(post.content);
          
          for (const hashtagName of hashtagsInPost) {
            if (!allHashtags.has(hashtagName)) {
              allHashtags.set(hashtagName, { count: 1, postIds: [post.id] });
            } else {
              const existing = allHashtags.get(hashtagName)!;
              existing.count += 1;
              existing.postIds.push(post.id);
            }
          }
        }

        // Kreiraj hashtagove u bazi i poveži ih sa postovima
        for (const [hashtagName, data] of allHashtags.entries()) {
          // Proveri da li hashtag već postoji
          const { data: existingHashtag } = await supabase
            .from("hashtags")
            .select("id")
            .eq("name", hashtagName)
            .maybeSingle();

          let hashtagId: string;

          if (existingHashtag) {
            hashtagId = existingHashtag.id;
            // Ažuriraj brojače
            await supabase
              .from("hashtags")
              .update({
                total_mentions: data.count,
                total_posts: new Set(data.postIds).size,
                updated_at: new Date().toISOString()
              })
              .eq("id", hashtagId);
          } else {
            // Kreiraj novi hashtag
            const { data: newHashtag, error: createError } = await supabase
              .from("hashtags")
              .insert({
                name: hashtagName,
                total_mentions: data.count,
                total_posts: new Set(data.postIds).size
              })
              .select()
              .single();

            if (createError) throw createError;
            hashtagId = newHashtag.id;
          }

          // Poveži hashtag sa postovima
          for (const postId of data.postIds) {
            // Proveri da li veza već postoji
            const { data: existingLink } = await supabase
              .from("post_hashtags")
              .select("id")
              .eq("post_id", postId)
              .eq("hashtag_id", hashtagId)
              .maybeSingle();

            if (!existingLink) {
              await supabase
                .from("post_hashtags")
                .insert({
                  post_id: postId,
                  hashtag_id: hashtagId
                });
            }
          }
        }

        console.log(`Extracted ${allHashtags.size} hashtags from ${allPosts.length} posts`);
        // Ponovo učitaj hashtagove
        await fetchHashtags();
      }
    } catch (error) {
      console.error("Error extracting hashtags from posts:", error);
    }
  };

  const fetchTrendingPosts = useCallback(async (): Promise<void> => {
    setLoadingPosts(true);
    try {
      // Uzmi postove sa hashtagovima i angažmanom
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (*),
          post_hashtags (
            hashtag_id,
            hashtags (*)
          ),
          likes (id),
          comments (id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const postsWithEngagement = (postsData || []).map((post: any) => {
        const likesCount = post.likes?.length || 0;
        const commentsCount = post.comments?.length || 0;
        const viewsCount = Math.floor(Math.random() * 5000);

        return {
          id: post.id,
          content: post.content,
          user_id: post.user_id,
          created_at: post.created_at,
          profiles: post.profiles,
          likes_count: likesCount,
          comments_count: commentsCount,
          views_count: viewsCount,
          hashtags: post.post_hashtags?.map((ph: any) => ph.hashtags) || []
        };
      });

      // Sortiraj po angažmanu
      const sortedPosts = postsWithEngagement.sort((a, b) => {
        const engagementA = a.likes_count + (a.comments_count * 2);
        const engagementB = b.likes_count + (b.comments_count * 2);
        return engagementB - engagementA;
      });

      setTrendingPosts(sortedPosts.slice(0, 20));
    } catch (error) {
      console.error("Error fetching trending posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [supabase]);

  // Funkcija za pretragu postova po hashtagu
  const searchPostsByHashtag = useCallback(async (hashtagName: string): Promise<void> => {
    setLoadingPosts(true);
    try {
      // Pronađi hashtag po imenu
      const { data: hashtagData, error: hashtagError } = await supabase
        .from("hashtags")
        .select("*")
        .eq("name", hashtagName.toLowerCase())
        .single();

      if (hashtagError) {
        console.log(`No hashtag found with name: ${hashtagName}`);
        setTrendingPosts([]);
        return;
      }

      // Pronađi postove povezane sa ovim hashtagom
      const { data: postHashtagsData, error: linkError } = await supabase
        .from("post_hashtags")
        .select(`
          post_id,
          posts (
            *,
            profiles (*),
            likes (id),
            comments (id)
          )
        `)
        .eq("hashtag_id", hashtagData.id)
        .order('created_at', { ascending: false });

      if (linkError) throw linkError;

      const postsWithEngagement = (postHashtagsData || []).map((item: any) => {
        const post = item.posts;
        const likesCount = post.likes?.length || 0;
        const commentsCount = post.comments?.length || 0;

        return {
          id: post.id,
          content: post.content,
          user_id: post.user_id,
          created_at: post.created_at,
          profiles: post.profiles,
          likes_count: likesCount,
          comments_count: commentsCount,
          views_count: Math.floor(Math.random() * 5000),
          hashtags: [hashtagData]
        };
      });

      setTrendingPosts(postsWithEngagement);
    } catch (error) {
      console.error("Error searching posts by hashtag:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [supabase]);

  // Kad se promeni search query, pretraži
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      if (query.startsWith('#')) {
        const hashtagName = query.slice(1).toLowerCase();
        void searchPostsByHashtag(hashtagName);
      } else {
        // Generička pretraga - možete dodati kasnije
        void fetchTrendingPosts();
      }
    } else {
      void fetchTrendingPosts();
    }
  }, [searchQuery, searchPostsByHashtag, fetchTrendingPosts]);

  useEffect(() => {
    void fetchUserData();
    void fetchHashtags();
  }, [fetchUserData, fetchHashtags]);

  // Check if user has saved a hashtag (using localStorage as temporary solution)
  const checkSavedHashtags = useCallback((): void => {
    if (!user) return;
    
    const saved = localStorage.getItem(`saved_hashtags_${user.id}`);
    if (saved) {
      setSavedHashtags(JSON.parse(saved));
    }
  }, [user]);

  useEffect(() => {
    checkSavedHashtags();
  }, [checkSavedHashtags]);

  const handleFollowChange = useCallback((userId: string, isFollowing: boolean): void => {
    if (isFollowing) {
      setFollowingUserIds(prev => [...prev, userId]);
    } else {
      setFollowingUserIds(prev => prev.filter(id => id !== userId));
    }
    
    void fetchUserData();
  }, [fetchUserData]);

  const handleSaveHashtag = (hashtagName: string): void => {
    if (!user) return;

    const isSaved = savedHashtags.includes(hashtagName);
    
    if (isSaved) {
      // Remove from saved
      const updated = savedHashtags.filter(name => name !== hashtagName);
      setSavedHashtags(updated);
      localStorage.setItem(`saved_hashtags_${user.id}`, JSON.stringify(updated));
    } else {
      // Add to saved
      const updated = [...savedHashtags, hashtagName];
      setSavedHashtags(updated);
      localStorage.setItem(`saved_hashtags_${user.id}`, JSON.stringify(updated));
    }
  };

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

      // Kreiraj post
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

        // Ekstrahuj hashtagove iz sadržaja
        const hashtagNames = extractHashtags(postContent);
        
        if (hashtagNames.length > 0) {
          for (const hashtagName of hashtagNames) {
            // Proveri da li hashtag već postoji
            const { data: existingHashtag } = await supabase
              .from("hashtags")
              .select("id, total_mentions, total_posts")
              .eq("name", hashtagName)
              .maybeSingle();

            let hashtagId: string;

            if (existingHashtag) {
              hashtagId = existingHashtag.id;
              // Ažuriraj brojače
              await supabase
                .from("hashtags")
                .update({
                  total_mentions: (existingHashtag.total_mentions || 0) + 1,
                  total_posts: (existingHashtag.total_posts || 0) + 1,
                  updated_at: new Date().toISOString()
                })
                .eq("id", hashtagId);
            } else {
              // Kreiraj novi hashtag
              const { data: newHashtag } = await supabase
                .from("hashtags")
                .insert({
                  name: hashtagName,
                  total_mentions: 1,
                  total_posts: 1
                })
                .select()
                .single();
              
              if (newHashtag) {
                hashtagId = newHashtag.id;
              } else {
                continue;
              }
            }
            
            // Poveži hashtag sa postom
            await supabase
              .from("post_hashtags")
              .insert({
                post_id: data.id,
                hashtag_id: hashtagId
              });
          }
        }
      }

      setPostContent("");
      setCharacterCount(0);
      setCreatePostDialogOpen(false);
      
      await fetchUserData();
      await fetchHashtags();
      await fetchTrendingPosts();
      
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

  // Funkcija za ručnu ekstrakciju hashtagova iz postojećih postova
  const handleExtractHashtags = async (): Promise<void> => {
    try {
      setLoadingHashtags(true);
      await extractHashtagsFromExistingPosts();
      alert("Hashtagovi su uspešno ekstrahovani iz postojećih postova!");
    } catch (error) {
      console.error("Error extracting hashtags:", error);
      alert("Došlo je do greške pri ekstrakciji hashtagova.");
    } finally {
      setLoadingHashtags(false);
    }
  };

  // Group hashtags by category
  const categorizedHashtags = useMemo(() => {
    const categories: Record<string, Hashtag[]> = {};
    
    hashtags.forEach(hashtag => {
      const category = hashtag.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(hashtag);
    });
    
    return Object.entries(categories).map(([categoryName, categoryHashtags]) => ({
      id: categoryName,
      name: getCategoryDisplayName(categoryName),
      icon: getCategoryIcon(categoryName),
      hashtags: categoryHashtags
    }));
  }, [hashtags]);

  // Filter hashtags based on search and selected category
  const filteredHashtags = useMemo(() => {
    let filtered = hashtags;
    
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(hashtag => 
        hashtag.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    if (searchQuery.trim() && !searchQuery.startsWith('#')) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(hashtag => 
        hashtag.name.toLowerCase().includes(query) ||
        hashtag.category?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [hashtags, selectedCategory, searchQuery]);

  // Get top trending hashtags
  const trendingHashtags = useMemo(() => {
    return [...hashtags]
      .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
      .slice(0, 10);
  }, [hashtags]);

  // Get unique categories from hashtags
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    hashtags.forEach(hashtag => {
      if (hashtag.category) {
        categories.add(hashtag.category);
      }
    });
    
    const result = Array.from(categories).map(category => ({
      id: category,
      name: getCategoryDisplayName(category),
      icon: getCategoryIcon(category),
      count: hashtags.filter(h => h.category === category).length
    }));
    
    // Dodaj opciju "Sve kategorije" na početak
    result.unshift({
      id: 'all',
      name: 'Sve kategorije',
      icon: 'Hash',
      count: hashtags.length
    });
    
    return result;
  }, [hashtags]);

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
                    <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10">
                      <Compass className="h-5 w-5" />
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
                    <Button variant="ghost" className="w-full justify-start gap-3">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-xl font-bold tracking-tight sm:inline">
                nexus explore
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="/explore" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Compass className="h-4 w-4" />
              Explore
            </Link>
            <Link href="/algorithms" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Brain className="h-4 w-4" />
              Algorithms
            </Link>
            <Link href="/trending" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Flame className="h-4 w-4" />
              Trending
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search #hashtags or topics..."
                className="w-48 sm:w-64 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
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
                
                {/* Saved Topics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">Saved Topics</span>
                  </div>
                  {savedHashtags.length > 0 ? (
                    <div className="space-y-2">
                      {savedHashtags.slice(0, 3).map((hashtag) => (
                        <div key={hashtag} className="flex items-center justify-between">
                          <Link 
                            href={`/explore/${hashtag}`}
                            className="text-sm hover:text-primary truncate"
                          >
                            #{hashtag}
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveHashtag(hashtag)}
                          >
                            <BookmarkCheck className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {savedHashtags.length > 3 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setExploreTab('topics')}
                        >
                          View all {savedHashtags.length} saved
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Save topics to track them here
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">EXPLORE FILTERS</h3>
                <div className="space-y-2">
                  <Button 
                    variant={exploreTab === 'trending' ? 'default' : 'outline'}
                    onClick={() => setExploreTab('trending')}
                    className="w-full justify-start gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    Trending Now
                  </Button>
                  <Button 
                    variant={exploreTab === 'topics' ? 'default' : 'outline'}
                    onClick={() => setExploreTab('topics')}
                    className="w-full justify-start gap-2"
                  >
                    <Hash className="h-4 w-4" />
                    Topics & Hashtags
                  </Button>
                  <Button 
                    variant={exploreTab === 'people' ? 'default' : 'outline'}
                    onClick={() => setExploreTab('people')}
                    className="w-full justify-start gap-2"
                  >
                    <Users className="h-4 w-4" />
                    People to Follow
                  </Button>
                  <Button 
                    variant={exploreTab === 'algorithms' ? 'default' : 'outline'}
                    onClick={() => setExploreTab('algorithms')}
                    className="w-full justify-start gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Discover Algorithms
                  </Button>
                </div>
              </div>

              {/* Admin Tools */}
              {isAuthenticated && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">TOOLS</h3>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={handleExtractHashtags}
                    disabled={loadingHashtags}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {loadingHashtags ? 'Extracting...' : 'Extract Hashtags'}
                  </Button>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Tabs */}
            <div className="lg:hidden mb-6">
              <Tabs 
                value={exploreTab} 
                onValueChange={(value) => setExploreTab(value as typeof exploreTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="trending" className="gap-2">
                    <Flame className="h-4 w-4" />
                    <span className="hidden sm:inline">Trending</span>
                  </TabsTrigger>
                  <TabsTrigger value="topics" className="gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="hidden sm:inline">Topics</span>
                  </TabsTrigger>
                  <TabsTrigger value="people" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">People</span>
                  </TabsTrigger>
                  <TabsTrigger value="algorithms" className="gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">Algos</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Welcome Card */}
            <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-blue-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className="h-6 w-6 text-emerald-500" />
                    <h2 className="text-2xl font-bold">Discover & Explore</h2>
                  </div>
                  <p className="mb-4 text-muted-foreground">
                    Find new topics, hashtags, and people to follow. Discover trending content and algorithms tailored to your interests.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
                      onClick={() => setExploreTab('trending')}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Trending Topics
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setExploreTab('people')}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Find People
                    </Button>
                    <Link href="/algorithms">
                      <Button variant="outline">
                        <Brain className="mr-2 h-4 w-4" />
                        Browse Algorithms
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-600/20">
                    <Target className="h-12 w-12 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Results Info */}
            {searchQuery && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium">
                      Search results for: <span className="text-blue-600 dark:text-blue-400">"{searchQuery}"</span>
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {searchQuery.startsWith('#') && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing posts with hashtag <span className="font-medium">{searchQuery}</span>
                  </p>
                )}
              </div>
            )}

            {/* Explore Content */}
            {exploreTab === 'trending' && (
              <div className="space-y-6">
                {/* Trending Topics Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        Trending Topics
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Most popular hashtags right now
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-2"
                      >
                        <Grid className="h-4 w-4" />
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="gap-2"
                      >
                        <List className="h-4 w-4" />
                        List
                      </Button>
                    </div>
                  </div>
                  
                  {loadingHashtags ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-xl border p-6">
                          <Skeleton className="h-6 w-32 mb-4" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : trendingHashtags.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center">
                      <Hash className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">No trending topics yet</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start posting with hashtags to see them here!
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button 
                          className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
                          onClick={() => setCreatePostDialogOpen(true)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Create First Post
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleExtractHashtags}
                          disabled={loadingHashtags}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Extract Hashtags
                        </Button>
                      </div>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trendingHashtags.map((hashtag, index) => (
                        <div 
                          key={hashtag.id} 
                          className="group rounded-xl border bg-card hover:shadow-md transition-all hover:border-emerald-500/20"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className={`
                                    ${index === 0 ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : ''}
                                    ${index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : ''}
                                    ${index === 2 ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : ''}
                                  `}
                                >
                                  #{index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {getCategoryDisplayName(hashtag.category)}
                                </span>
                              </div>
                              {isAuthenticated && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveHashtag(hashtag.name)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {savedHashtags.includes(hashtag.name) ? (
                                    <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSearchQuery(`#${hashtag.name}`)}
                              className="block mb-4 text-left w-full"
                            >
                              <h4 className="text-xl font-bold mb-2 hover:text-emerald-600 transition-colors">
                                #{hashtag.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {hashtag.total_posts.toLocaleString()} posts • {hashtag.total_mentions.toLocaleString()} mentions
                              </p>
                            </button>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Trending Score</span>
                                <span className="font-semibold">
                                  {Math.round(hashtag.trending_score || 0).toLocaleString()}
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(100, ((hashtag.trending_score || 0) / 10000) * 100)} 
                                className="h-2"
                              />
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  {hashtag.growth_rate && hashtag.growth_rate > 0 ? (
                                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className={hashtag.growth_rate && hashtag.growth_rate > 0 ? "text-green-500" : "text-red-500"}>
                                    {hashtag.growth_rate ? Math.abs(hashtag.growth_rate * 100).toFixed(1) : 0}%
                                  </span>
                                </div>
                                {hashtag.last_trending_at && (
                                  <span className="text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {new Date(hashtag.last_trending_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSearchQuery(`#${hashtag.name}`)}
                              className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Explore posts
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trendingHashtags.map((hashtag, index) => (
                        <div 
                          key={hashtag.id} 
                          className="rounded-xl border bg-card hover:shadow-md transition-all"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Badge 
                                  variant="secondary" 
                                  className={`
                                    ${index === 0 ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : ''}
                                    ${index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : ''}
                                    ${index === 2 ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : ''}
                                  `}
                                >
                                  #{index + 1}
                                </Badge>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setSearchQuery(`#${hashtag.name}`)}
                                    className="flex items-center gap-2 group text-left"
                                  >
                                    <h4 className="text-lg font-bold hover:text-emerald-600 transition-colors">
                                      #{hashtag.name}
                                    </h4>
                                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <p className="text-sm text-muted-foreground">
                                    {getCategoryDisplayName(hashtag.category)} • {hashtag.total_posts.toLocaleString()} posts
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm font-semibold">
                                    {Math.round(hashtag.trending_score || 0).toLocaleString()} score
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {hashtag.total_mentions.toLocaleString()} mentions
                                  </p>
                                </div>
                                {isAuthenticated && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveHashtag(hashtag.name)}
                                  >
                                    {savedHashtags.includes(hashtag.name) ? (
                                      <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Bookmark className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trending Posts */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Trending Posts</h3>
                    <span className="text-sm text-muted-foreground">
                      {searchQuery ? 'Search Results' : 'Most Engaging Posts'}
                    </span>
                  </div>
                  
                  {loadingPosts ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-20" />
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
                            <Skeleton className="h-9 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : trendingPosts.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center">
                      {searchQuery ? (
                        <>
                          <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                          <h3 className="mt-4 text-lg font-semibold">No posts found</h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            No posts found for "{searchQuery}"
                          </p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setSearchQuery('')}
                          >
                            Clear search
                          </Button>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                          <h3 className="mt-4 text-lg font-semibold">No trending posts yet</h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            Be the first to create engaging content!
                          </p>
                          <Button 
                            className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
                            onClick={() => setCreatePostDialogOpen(true)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Create Post
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trendingPosts.map((post) => (
                        <div key={post.id} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
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
                                <div className="flex items-center gap-2">
                                  <Link 
                                    href={`/profile/${post.profiles.username}`}
                                    className="font-medium hover:text-primary"
                                  >
                                    {post.profiles.display_name || post.profiles.username}
                                  </Link>
                                  <Badge variant="outline">
                                    Trending
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  @{post.profiles.username}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                              {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {post.hashtags.slice(0, 2).map((hashtag) => (
                                    <button
                                      key={hashtag.id}
                                      type="button"
                                      onClick={() => setSearchQuery(`#${hashtag.name}`)}
                                      className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/80 transition-colors"
                                    >
                                      #{hashtag.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="whitespace-pre-wrap">
                              {linkHashtagsInContent(post.content)}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{post.likes_count}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{post.comments_count}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{post.views_count.toLocaleString()}</span>
                              </div>
                            </div>
                            
                            <Link href={`/post/${post.id}`}>
                              <Button variant="outline" size="sm">
                                View Post
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {exploreTab === 'topics' && (
              <div className="space-y-8">
                {/* Search & Filter */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">All Topics & Hashtags</h3>
                      <p className="text-sm text-muted-foreground">
                        Browse {hashtags.length} topics across various categories
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            {selectedCategory ? getCategoryDisplayName(selectedCategory) : 'Sve kategorije'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {uniqueCategories.map((category) => (
                            <DropdownMenuItem 
                              key={category.id}
                              onClick={() => setSelectedCategory(category.id)}
                            >
                              {category.name} ({category.count})
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-2"
                      >
                        <Grid className="h-4 w-4" />
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="gap-2"
                      >
                        <List className="h-4 w-4" />
                        List
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search topics or hashtags..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Popular Categories */}
                {uniqueCategories.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Popular Categories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {uniqueCategories.slice(0, 6).map((category) => (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.id ? 'default' : 'outline'}
                          className="h-24 flex-col gap-2"
                          onClick={() => setSelectedCategory(
                            selectedCategory === category.id ? null : category.id
                          )}
                        >
                          {getCategoryIconComponent(getCategoryIcon(category.id))}
                          <span className="font-medium truncate px-2">{category.name}</span>
                          <span className="text-xs text-muted-foreground">{category.count}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedCategory ? getCategoryDisplayName(selectedCategory) : 'Sve kategorije'} Topics
                        <span className="text-sm text-muted-foreground ml-2">
                          ({filteredHashtags.length} topics)
                        </span>
                      </h3>
                      {searchQuery && !searchQuery.startsWith('#') && (
                        <p className="text-sm text-muted-foreground">
                          Search results for "{searchQuery}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {loadingHashtags ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="rounded-xl border p-6">
                          <Skeleton className="h-6 w-32 mb-4" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredHashtags.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center">
                      <Hash className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">No topics found</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {searchQuery ? `No results for "${searchQuery}"` : 'No topics available yet'}
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory(null);
                          }}
                        >
                          Clear filters
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleExtractHashtags}
                          disabled={loadingHashtags}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Extract Hashtags
                        </Button>
                      </div>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredHashtags.map((hashtag) => (
                        <div 
                          key={hashtag.id} 
                          className="group rounded-xl border bg-card hover:shadow-md transition-all"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              {hashtag.category && hashtag.category !== 'uncategorized' && (
                                <Badge variant="outline">
                                  {getCategoryDisplayName(hashtag.category)}
                                </Badge>
                              )}
                              {isAuthenticated && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveHashtag(hashtag.name)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {savedHashtags.includes(hashtag.name) ? (
                                    <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSearchQuery(`#${hashtag.name}`)}
                              className="block mb-4 text-left w-full"
                            >
                              <h4 className="text-xl font-bold mb-2 hover:text-emerald-600 transition-colors">
                                #{hashtag.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {hashtag.total_posts.toLocaleString()} posts
                              </p>
                            </button>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total Mentions</span>
                                <span className="font-semibold">
                                  {hashtag.total_mentions.toLocaleString()}
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(100, (hashtag.total_mentions / Math.max(...filteredHashtags.map(h => h.total_mentions), 1)) * 100)} 
                                className="h-2"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSearchQuery(`#${hashtag.name}`)}
                              className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Explore topic
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredHashtags.map((hashtag) => (
                        <div 
                          key={hashtag.id} 
                          className="rounded-xl border bg-card hover:shadow-md transition-all"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                                  <HashIcon className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setSearchQuery(`#${hashtag.name}`)}
                                    className="flex items-center gap-2 group text-left"
                                  >
                                    <h4 className="text-lg font-bold hover:text-emerald-600 transition-colors">
                                      #{hashtag.name}
                                    </h4>
                                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <div className="flex items-center gap-2 mt-1">
                                    {hashtag.category && hashtag.category !== 'uncategorized' && (
                                      <Badge variant="outline">
                                        {getCategoryDisplayName(hashtag.category)}
                                      </Badge>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {hashtag.total_posts.toLocaleString()} posts
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-lg font-semibold">
                                    {hashtag.total_mentions.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    mentions
                                  </p>
                                </div>
                                {isAuthenticated && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveHashtag(hashtag.name)}
                                  >
                                    {savedHashtags.includes(hashtag.name) ? (
                                      <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Bookmark className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {exploreTab === 'people' && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Discover People</h3>
                  <p className="text-muted-foreground mb-6">
                    Find interesting people to follow based on your interests and activity.
                  </p>
                  
                  {/* People discovery would be implemented here */}
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">People Discovery</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Follow more people to get better recommendations
                    </p>
                    <Link href="/" className="mt-4 inline-block">
                      <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go to Home Feed
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {exploreTab === 'algorithms' && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Discover Algorithms</h3>
                  <p className="text-muted-foreground mb-6">
                    Explore feed algorithms created by the community.
                  </p>
                  
                  {algorithmCategories.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-medium mb-4">Browse by Category</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {algorithmCategories.map((category) => (
                          <Link
                            key={category.id}
                            href={`/algorithms?category=${category.slug}`}
                            className="rounded-lg border p-4 hover:border-primary hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Hash className="h-4 w-4" />
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {category.description || 'Explore algorithms'}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center py-8">
                    <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Algorithm Discovery</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Browse and install feed algorithms
                    </p>
                    <Link href="/algorithms" className="mt-4 inline-block">
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
                        <Brain className="mr-2 h-4 w-4" />
                        Browse All Algorithms
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Load More */}
            <div className="mt-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Want to see more trending content?
              </p>
              <Link href="/trending">
                <Button className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700">
                  <Flame className="mr-2 h-4 w-4" />
                  View Trending Page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Sidebar - Categories & Info */}
          <aside className="hidden w-80 flex-shrink-0 xl:block">
            <div className="sticky top-24 space-y-6">
              {/* Trending Now */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Trending Now
                </h3>
                <div className="space-y-4">
                  {trendingHashtags.slice(0, 5).map((hashtag, index) => (
                    <div key={hashtag.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          #{index + 1}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setSearchQuery(`#${hashtag.name}`)}
                          className="font-medium hover:text-primary text-sm"
                        >
                          #{hashtag.name}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hashtag.total_mentions.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {uniqueCategories.length > 0 && (
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Top Categories
                  </h3>
                  <div className="space-y-3">
                    {uniqueCategories.slice(0, 6).map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setExploreTab('topics');
                          setSelectedCategory(category.id);
                        }}
                        className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIconComponent(getCategoryIcon(category.id))}
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <Badge variant="secondary">{category.count}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Explore Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Total Topics</p>
                      <p className="text-2xl font-bold">{hashtags.length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Hash className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg. Posts/Topic</p>
                      <p className="text-lg font-bold">
                        {hashtags.length > 0 
                          ? Math.round(hashtags.reduce((acc, h) => acc + h.total_posts, 0) / hashtags.length)
                          : 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Active Today</p>
                      <p className="text-lg font-bold">
                        {Math.floor(hashtags.length * 0.3)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-6 text-white">
                <div className="mb-4">
                  <Sparkle className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Start Exploring</h3>
                <p className="mb-4 text-sm text-emerald-100">
                  Follow topics to personalize your feed
                </p>
                <Button 
                  className="w-full bg-white text-emerald-600 hover:bg-gray-100"
                  size="lg"
                  onClick={() => setExploreTab('topics')}
                >
                  <Compass className="mr-2 h-4 w-4" />
                  Browse Topics
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
                  placeholder="What's happening? Use #hashtags to categorize your post..."
                  value={postContent}
                  onChange={handleContentChange}
                  className="min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-lg"
                  maxLength={280}
                  disabled={posting}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  Tip: Use hashtags like #technology #programming #ai to reach more people
                </div>
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
            
            {/* Show extracted hashtags preview */}
            {postContent && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Hashtags in this post:</div>
                <div className="flex flex-wrap gap-1">
                  {extractHashtags(postContent).map((hashtag, index) => (
                    <Badge key={index} variant="secondary">
                      #{hashtag}
                    </Badge>
                  ))}
                  {extractHashtags(postContent).length === 0 && (
                    <span className="text-xs text-muted-foreground">No hashtags detected</span>
                  )}
                </div>
              </div>
            )}
            
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
                className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <button 
            type="button"
            className="flex flex-col items-center gap-1 p-2 text-emerald-500"
            aria-label="Explore"
          >
            <Compass className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </button>
          <Link href="/trending" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Flame className="h-5 w-5" />
            <span className="text-xs">Trending</span>
          </Link>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
                <Compass className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">nexus explore</span>
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Discover new horizons
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

// Helper functions
function getCategoryIcon(category: string | null): string {
  if (!category) return 'Hash';
  
  const icons: Record<string, string> = {
    'technology': 'Zap',
    'tech': 'Zap',
    'science': 'Flask',
    'art': 'Palette',
    'design': 'Palette',
    'business': 'TrendingUp',
    'finance': 'TrendingUp',
    'entertainment': 'Film',
    'movies': 'Film',
    'sports': 'Trophy',
    'music': 'Music',
    'gaming': 'Gamepad',
    'food': 'Utensils',
    'travel': 'Globe',
    'education': 'GraduationCap',
    'health': 'Heart',
    'fitness': 'Heart',
    'fashion': 'Shirt',
    'photography': 'Camera',
    'politics': 'Flag',
    'news': 'Newspaper',
    'programming': 'Code',
    'ai': 'Brain',
    'startup': 'Rocket',
  };
  
  const lowerCategory = category.toLowerCase();
  return icons[lowerCategory] || 'Hash';
}

function getCategoryIconComponent(iconName: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    'Zap': <Zap className="h-5 w-5 text-blue-500" />,
    'Flask': <FlaskIcon className="h-5 w-5 text-purple-500" />,
    'Palette': <PaletteIcon className="h-5 w-5 text-pink-500" />,
    'TrendingUp': <TrendingUp className="h-5 w-5 text-green-500" />,
    'Film': <FilmIcon className="h-5 w-5 text-yellow-500" />,
    'Trophy': <TrophyIcon className="h-5 w-5 text-orange-500" />,
    'Music': <MusicIcon className="h-5 w-5 text-red-500" />,
    'Gamepad': <GamepadIcon className="h-5 w-5 text-indigo-500" />,
    'Utensils': <UtensilsIcon className="h-5 w-5 text-amber-500" />,
    'Globe': <Globe className="h-5 w-5 text-cyan-500" />,
    'GraduationCap': <GraduationCapIcon className="h-5 w-5 text-emerald-500" />,
    'Heart': <Heart className="h-5 w-5 text-rose-500" />,
    'Shirt': <ShirtIcon className="h-5 w-5 text-fuchsia-500" />,
    'Camera': <CameraIcon className="h-5 w-5 text-sky-500" />,
    'Flag': <FlagIcon className="h-5 w-5 text-red-500" />,
    'Newspaper': <NewspaperIcon className="h-5 w-5 text-gray-500" />,
    'Code': <CodeIcon className="h-5 w-5 text-violet-500" />,
    'Brain': <Brain className="h-5 w-5 text-indigo-500" />,
    'Rocket': <Rocket className="h-5 w-5 text-orange-500" />,
  };
  
  return icons[iconName] || <Hash className="h-5 w-5 text-gray-500" />;
}

function getCategoryDisplayName(category: string | null): string {
  if (!category || category === 'uncategorized' || category === 'all') return 'Uncategorized';
  
  const displayNames: Record<string, string> = {
    'tech': 'Technology',
    'ai': 'AI & Machine Learning',
    'programming': 'Programming',
    'startup': 'Startups',
    'finance': 'Finance',
    'movies': 'Movies',
    'fitness': 'Fitness',
    'gaming': 'Gaming',
  };
  
  const lowerCategory = category.toLowerCase();
  if (displayNames[lowerCategory]) {
    return displayNames[lowerCategory];
  }
  
  // Capitalize first letter of each word
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Missing icons (dodajte ih na kraju fajla)
const FlaskIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2v6l4 4v12" />
    <path d="M16 10V6a2 2 0 0 0-2-2H8" />
    <path d="M6 10h12" />
    <path d="M14 22v-8" />
  </svg>
);

const PaletteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13.5" cy="6.5" r="1" />
    <circle cx="17.5" cy="10.5" r="1" />
    <circle cx="8.5" cy="7.5" r="1" />
    <circle cx="6.5" cy="12.5" r="1" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const FilmIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const MusicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const GamepadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="15" y1="13" x2="15" y2="13" />
    <line x1="18" y1="11" x2="18" y2="11" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

const UtensilsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

const GraduationCapIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

const ShirtIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </svg>
);

const CameraIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const FlagIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const NewspaperIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
  </svg>
);

const CodeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);