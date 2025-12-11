// components/feed/AlgorithmFeed.tsx (Updated version)
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

const feedGenerator = new FeedGenerator();

export function AlgorithmFeed({ 
  userId, 
  initialAlgorithm,
  showExplanations = false 
}: AlgorithmFeedProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [algorithm, setAlgorithm] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [showAllExplanations, setShowAllExplanations] = useState(showExplanations);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const result = await feedGenerator.generateFeed({
        userId,
        algorithmSlug: initialAlgorithm,
        limit: 20,
        includeExplanations: showAllExplanations
      });
      
      setPosts(result.posts);
      setAlgorithm(result.algorithm);
      if (result.explanations) {
        setExplanations(result.explanations);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, initialAlgorithm, showAllExplanations]);

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
              {/* Post Card */}
              <div className="relative">
                <PostCard post={post} />
                
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