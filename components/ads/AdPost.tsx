// components/ads/AdPost.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/post/post-card';
import type { AdExplanation } from '@/lib/ads/ad-service';
import { createClient } from '@/lib/supabase/client';

interface AdPostProps {
  promotedPostId: string;
  postData: any;
  explanation: AdExplanation;
  onView: () => void;
  onLike: () => void;
  onFollow: () => void;
}

export function AdPost({ 
  promotedPostId, 
  postData,
  explanation, 
  onView, 
  onLike,
  onFollow 
}: AdPostProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasFollowed, setHasFollowed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Pozovi onView kada se komponenta mountuje
  useEffect(() => {
    if (!hasViewed) {
      onView();
      setHasViewed(true);
    }
  }, [hasViewed, onView]);

  // Check if user has already liked this post
  useEffect(() => {
    const checkLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postData.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsLiked(!!data);
    };

    void checkLikeStatus();
  }, [postData.id, supabase]);

  // Handle like action - presreći like akciju
  useEffect(() => {
    const handleLikeClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Proveri da li je kliknuto na like button ili heart icon
      const likeButton = target.closest('button[title="Like"], button[title="Unlike"]');
      
      if (likeButton && containerRef.current?.contains(target)) {
        // Sačekaj da se like završi
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Proveri novi status
          const { data } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          const newLikeStatus = !!data;

          // Ako je upravo lajkovano (prelazak iz false u true)
          if (newLikeStatus && !isLiked && !hasLiked) {
            onLike();
            setHasLiked(true);
          }

          setIsLiked(newLikeStatus);
        }, 100);
      }
    };

    document.addEventListener('click', handleLikeClick);
    return () => document.removeEventListener('click', handleLikeClick);
  }, [isLiked, hasLiked, onLike, postData.id, supabase]);

  // Handle follow action
  const handleFollowAction = useCallback((userId: string, isFollowing: boolean) => {
    if (isFollowing && !hasFollowed) {
      onFollow();
      setHasFollowed(true);
    }
  }, [hasFollowed, onFollow]);

  if (!postData) {
    return null;
  }

  // Transform post data to match PostCard format
  const transformedPost = {
    id: postData.id,
    content: postData.content,
    image_url: postData.image_url,
    created_at: postData.created_at,
    user_id: postData.user_id,
    username: postData.profiles?.username || 'user',
    display_name: postData.profiles?.display_name || 'User',
    avatar_url: postData.profiles?.avatar_url,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: isLiked,
    provenance: postData.provenance
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Sponsored Badge - Above Post */}
      <div className="mb-3 flex items-center justify-between rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Sponzorisano
          </span>
          <Badge variant="outline" className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
            Reklama
          </Badge>
        </div>

<div className="mb-2 flex justify-center">
  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-linear-to-r from-red-500 to-orange-500 text-white font-bold text-sm animate-pulse">
    <span className="flex items-center gap-1">
      <span className="text-lg">💰</span>
      <span>PLAĆENA REKLAMA</span>
      <span className="text-lg">💰</span>
    </span>
  </div>
</div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 gap-1 h-7"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="text-xs">Zašto vidim ovo?</span>
        </Button>
      </div>

      {/* Explanation Panel */}
      {showExplanation && (
        <div className="mb-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Zašto vidiš ovu reklamu
              </h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowExplanation(false)}
                className="h-6 w-6 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {explanation.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            
            {explanation.hashtag_matches.length > 0 && (
              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Poklapanje sa tvojim interesima:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.hashtag_matches.map((tag, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary"
                      className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ℹ️ Ova reklama je prilagođena tvojim interesima. Ne pratimo te van platforme.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post Card with special styling */}
      <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <PostCard 
          post={transformedPost}
          showFollowButton={true}
          onFollowChange={handleFollowAction}
          variant="minimal"
          compact={false}
        />
      </div>

      {/* Bottom Info */}
      <div className="mt-2 px-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Plaćeni sadržaj • Klikni na "Zašto vidim ovo?" za detalje
        </p>
      </div>
    </div>
  );
}