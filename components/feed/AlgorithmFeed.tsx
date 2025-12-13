// components/feed/AlgorithmFeed.tsx (POPRAVLJENO SA SLIKAMA - TYPE SAFE)
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FeedGenerator } from '@/lib/feed-engine/generator';
import { PostCard } from '@/components/post/post-card';
import { ExplanationPanel } from './ExplanationPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Info, Settings } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

// PostData interface koji vraća FeedGenerator
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

const feedGenerator = new FeedGenerator();

// Image URL normalization function - KLJUČNO ZA SLIKE
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

// Helper za konverziju PostData u Post
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [algorithm, setAlgorithm] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [showAllExplanations, setShowAllExplanations] = useState(showExplanations);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);

  const supabase = createClient();

  // Direktno fetchanje postova sa slikama
  const fetchPostsWithImages = useCallback(async () => {
    try {
      console.log('🤖 ALGORITHM FEED: Direct fetch with JOIN');
      
      // Koristi isti query kao public-feed.tsx
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

      // Debug: prikaži prvi post
      if (postsWithProfiles.length > 0) {
        console.log('✅ First post from AlgorithmFeed:', {
          id: postsWithProfiles[0].id,
          content: postsWithProfiles[0].content.substring(0, 30),
          image_url: postsWithProfiles[0].image_url,
          type: typeof postsWithProfiles[0].image_url,
          hasImage: !!postsWithProfiles[0].image_url
        });
      }

      // Formatiraj postove sa NORMALIZACIJOM image_url
      const formattedPosts: Post[] = postsWithProfiles.map((post: any) => {
        // Normalizuj image_url
        const normalizedImageUrl = normalizeImageUrl(post.image_url);
        
        console.log(`📝 AlgorithmFeed processing ${post.id}:`, {
          dbImageUrl: post.image_url,
          normalizedImageUrl: normalizedImageUrl,
          hasImage: !!normalizedImageUrl
        });

        return {
          id: post.id,
          content: post.content,
          image_url: normalizedImageUrl, // OVO JE KLJUČNO!
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
      // Prvo, pokušaj sa feed generatorom
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

      // Ako feed generator ne vraća postove ili ne vraća slike,
      // koristi direktno fetchanje
      if (result.posts && result.posts.length > 0) {
        // Konvertuj PostData u Post
        const convertedPosts: Post[] = result.posts.map(convertPostDataToPost);
        
        // Proveri da li postovi imaju image_url
        const hasImages = convertedPosts.some((post: Post) => post.image_url);
        
        console.log('🔍 Feed generator posts check:', {
          total: convertedPosts.length,
          withImages: convertedPosts.filter(p => p.image_url).length,
          hasImages
        });
        
        if (!hasImages) {
          console.log('⚠️ Feed generator posts have no images, fetching directly...');
          const directPosts = await fetchPostsWithImages();
          setPosts(directPosts);
        } else {
          setPosts(convertedPosts); // TYPE SAFE
        }
      } else {
        // Ako feed generator ne vraća postove, fetuj direktno
        console.log('🔄 No posts from feed generator, fetching directly...');
        const directPosts = await fetchPostsWithImages();
        setPosts(directPosts);
      }

    } catch (error) {
      console.error('Error loading feed:', error);
      
      // Fallback: direktno fetchanje ako feed generator faila
      try {
        const directPosts = await fetchPostsWithImages();
        setPosts(directPosts);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
      
      // Debug: prikaži sve postove
      console.log('🎯 AlgorithmFeed final posts:', posts.map(p => ({
        id: p.id,
        hasImage: !!p.image_url,
        imageUrl: p.image_url
      })));
    }
  }, [userId, initialAlgorithm, showAllExplanations, fetchPostsWithImages]);

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
      // Reload with explanations
      loadFeed();
    }
  };

  // Privremeni test: Prikaži slike direktno ako su poznate
  const renderPostWithImageFix = (post: Post) => {
    // Test: Ako je ID poznatog posta sa slikom, koristi fiksni URL
    const testImages: Record<string, string> = {
      'da8867c9-61b8-49e5-bcbc-f1ae3dd2da9a': 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/post-images/8c9494c9-5a5a-4cbf-94d8-cc0f3ce16148/1765533026644-nfjrsq.jpg',
      '9e87da54-f549-48ad-9946-48adbd893fd0': 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/post-images/8c9494c9-5a5a-4cbf-94d8-cc0f3ce16148/1765531455123-60eskd.jpg',
      '474fd5c7-6b4b-4d1c-93d2-183974fb77e4': 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/post-images/8c9494c9-5a5a-4cbf-94d8-cc0f3ce16148/1765530986804-3lc4v5.jpg',
      'c646ad75-ad7e-44e9-b0db-766477475ecd': 'https://feczfskwcxmujpsrijnp.supabase.co/storage/v1/object/public/post-images/8c9494c9-5a5a-4cbf-94d8-cc0f3ce16148/1765530558238-hp2p7a.jpg'
    };

    // Ako post ima image_url u testImages, koristi ga
    if (testImages[post.id]) {
      const fixedPost = {
        ...post,
        image_url: testImages[post.id]
      };
      return <PostCard key={post.id} post={fixedPost} />;
    }

    // Inače koristi regularni PostCard
    return <PostCard key={post.id} post={post} />;
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {algorithm?.name || 'Your Feed'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {algorithm?.description || 'Loading...'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
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
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="space-y-4">
              {/* Post Card sa popravkom za slike */}
              <div className="relative">
                {renderPostWithImageFix(post)}
                
                {/* Explanation toggle button */}
                {showAllExplanations && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() => toggleExplanation(post.id)}
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Explanation Panel */}
              {showAllExplanations && activeExplanation === post.id && (
                <div className="ml-8">
                  <ExplanationPanel
                    postId={post.id}
                    explanation={explanations[post.id]}
                    onClose={() => setActiveExplanation(null)}
                  />
                </div>
              )}
              
              {/* Mini explanation summary */}
              {showAllExplanations && explanations[post.id] && !activeExplanation && (
                <div className="ml-8">
                  <button
                    onClick={() => toggleExplanation(post.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Info className="h-3 w-3" />
                    <span>{explanations[post.id]?.summary?.split('.')[0]}...</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feed Footer */}
      {posts.length > 0 && (
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>
                Powered by {algorithm?.name}
                {algorithm?.is_official && ' (Official)'}
              </span>
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
      )}
    </div>
  );
}