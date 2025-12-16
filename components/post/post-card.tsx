// components/post/post-card.tsx - ULTRA OPTIMIZOVANA VERZIJA
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { detectAdvertisement } from '@/components/utils/ad-detector';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Share, 
  Bookmark,
  Sparkles,
  Globe,
  BarChart3,
  Repeat,
  CheckCircle,
  AlertCircle,
  Bot,
  Edit,
  ImageIcon,
  ExternalLink,
  X,
  ArrowRight,
  Expand,
  ZoomIn,
  Download,
  Copy,
  Eye,
  Clock,
  TrendingUp,
  DollarSign,
  Ban,
  ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { FollowButton } from "@/components/follow/follow-button";
import { LikesList } from "@/components/post/likes-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    isAd?: boolean;
  };
  verification?: {
    selfSigned: boolean;
    timestamped: boolean;
    hashChain: boolean;
  };
}

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

interface PostCardProps {
  post: Post;
  showFollowButton?: boolean;
  currentUserId?: string;
  isCurrentUserFollowing?: boolean;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  compact?: boolean;
  onRepost?: (postId: string) => Promise<void>;
  variant?: 'default' | 'elevated' | 'minimal';
  hideAdBadges?: boolean;
  onUserBlocked?: (blockedUserId: string) => void;
}

// ============ HELPER FUNCTIONS (MEMOIZED) ============

const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

const getImageUrl = (url: string | null): string | null => {
  const normalizedUrl = normalizeImageUrl(url);
  
  if (!normalizedUrl) return null;
  
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  
  if (normalizedUrl.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return baseUrl + normalizedUrl;
  }
  
  if (normalizedUrl.includes('/') && !normalizedUrl.includes('http')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/${normalizedUrl}`;
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    return `https://picsum.photos/800/600?random=${Math.random()}`;
  }
  
  return normalizedUrl;
};

const getOptimizedImageUrl = (url: string | null, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
}): string | null => {
  const imageUrl = getImageUrl(url);
  if (!imageUrl) return null;

  const { width = 800, height = 600, quality = 85, format = 'webp' } = options || {};
  
  if (imageUrl.includes('supabase.co')) {
    return `${imageUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`;
  }
  
  return imageUrl;
};

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  const d = new Date(date as string);
  return d instanceof Date && !isNaN(d.getTime());
};

const safeFormatDistanceToNow = (dateString: string): string => {
  try {
    if (!dateString) return 'Invalid date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};

const safeFormatDateMobile = (dateString: string): string => {
  try {
    if (!isValidDate(dateString)) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = diffInHours * 60;
      if (diffInMinutes < 1) return "now";
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });
    }
  } catch {
    return 'N/A';
  }
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

// ============ PROVENANCE BADGE (MEMOIZED) ============

const ProvenanceBadge = memo(function ProvenanceBadge({ 
  provenance, 
  postId 
}: { provenance?: PostProvenance; postId: string }) {
  const status = useMemo(() => {
    if (!provenance) return 'unknown';
    const { signature } = provenance;
    
    if (signature?.startsWith('nexus-sig-') || signature?.startsWith('nexus-basic-')) {
      return 'verified';
    }
    return 'unverified';
  }, [provenance]);

  const isAI = provenance?.metadata?.isAIGenerated;
  const isRepost = provenance?.metadata?.originalPostId;
  const isEdit = provenance?.metadata?.editOf;

  return (
    <div className="flex flex-wrap gap-1">
      {status === 'verified' && (
        <Badge variant="outline" className="text-xs gap-1 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
          Verified
        </Badge>
      )}
      
      {status === 'unverified' && (
        <Badge variant="outline" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3 text-amber-500" />
          Unverified
        </Badge>
      )}
      
      {isAI && (
        <Badge variant="outline" className="text-xs gap-1 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <Bot className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          AI
        </Badge>
      )}
      
      {isRepost && (
        <Badge variant="outline" className="text-xs gap-1 bg-blue-50 dark:bg-blue-900/20">
          <Repeat className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Repost
        </Badge>
      )}
      
      {isEdit && (
        <Badge variant="outline" className="text-xs gap-1 bg-purple-50 dark:bg-purple-900/20">
          <Edit className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          Edited
        </Badge>
      )}
    </div>
  );
});

// ============ IMAGE PREVIEW COMPONENT ============

const ImagePreview = memo(function ImagePreview({ 
  imageUrl, 
  alt, 
  onClose 
}: { 
  imageUrl: string; 
  alt: string; 
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [imageUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [imageUrl]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
    if (e.key === 'z' || e.key === 'Z') setIsZoomed(!isZoomed);
  }, [handleClose, isZoomed]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh]">
        {/* Header controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? "Zoom out (Z)" : "Zoom in (Z)"}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={handleCopyLink}
            title="Copy image link"
          >
            <Copy className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download image"
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            title="Close (ESC)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Image container */}
        <div className="relative w-full h-[80vh] rounded-2xl overflow-hidden">
          {imageError ? (
            <div className="flex items-center justify-center h-full w-full bg-gray-900">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <p className="text-white text-lg font-medium">Unable to load image</p>
              </div>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={alt}
              fill
              className={`object-contain transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              sizes="100vw"
              priority
              onClick={() => setIsZoomed(!isZoomed)}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

// ============ MAIN POSTCARD COMPONENT ============

export const PostCard = memo(function PostCard({ 
  post, 
  showFollowButton = false,
  currentUserId,
  isCurrentUserFollowing = false,
  onFollowChange,
  compact = false,
  onRepost,
  variant = 'default',
  hideAdBadges = false,
  onUserBlocked
}: PostCardProps) {
  const router = useRouter();
  
  // State refs za bolje performanse
  const stateRefs = useRef({
    liked: post.user_has_liked,
    likesCount: post.likes_count,
    isAuthenticated: false,
    authUserId: null as string | null,
    isBlocked: false
  });

  // Regular state samo za UI updates
  const [likedUI, setLikedUI] = useState(post.user_has_liked);
  const [likesCountUI, setLikesCountUI] = useState(post.likes_count);
  const [loading, setLoading] = useState(false);
  const [showLikesDialog, setShowLikesDialog] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // Refs za optimizaciju
  const postRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Memoizovane vrednosti
  const adDetection = useMemo(() => detectAdvertisement(post.content || ''), [post.content]);
  const isAd = useMemo(() => {
    return !hideAdBadges && (post.is_ad || 
             post.provenance?.metadata?.isAd || 
             adDetection.isAd);
  }, [hideAdBadges, post.is_ad, post.provenance?.metadata?.isAd, adDetection.isAd]);

  const currentUser = useMemo(() => currentUserId || stateRefs.current.authUserId, [currentUserId]);
  const isFollowing = useMemo(() => isCurrentUserFollowing || false, [isCurrentUserFollowing]);

  const imageUrl = useMemo(() => getImageUrl(post.image_url), [post.image_url]);
  const optimizedImageUrl = useMemo(() => 
    getOptimizedImageUrl(post.image_url, { 
      width: 800, 
      height: 600, 
      quality: 90,
      format: 'webp'
    }), [post.image_url]);

  // Memoizovane funkcije za datum
  const formattedDate = useMemo(() => safeFormatDistanceToNow(post.created_at), [post.created_at]);
  const formattedDateMobile = useMemo(() => safeFormatDateMobile(post.created_at), [post.created_at]);

  // Intersection Observer za lazy loading slike
  useEffect(() => {
    if (!imageRef.current || !optimizedImageUrl) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.src !== optimizedImageUrl) {
              img.src = optimizedImageUrl;
            }
            observerRef.current?.unobserve(img);
          }
        });
      },
      { rootMargin: '200px' }
    );

    observerRef.current.observe(imageRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [optimizedImageUrl]);

  // Check authentication and user's like status
  useEffect(() => {
    const checkAuthAndBlockStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      stateRefs.current.isAuthenticated = !!user;
      stateRefs.current.authUserId = user?.id || null;
      
      if (user) {
        // Check if user liked the post
        const { data: like } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();
        
        stateRefs.current.liked = !!like;
        setLikedUI(!!like);

        // Check if user blocked the post author
        if (post.user_id) {
          const { data: block } = await supabase
            .from("user_blocks")
            .select("id")
            .eq("blocker_id", user.id)
            .eq("blocked_id", post.user_id)
            .maybeSingle();
          
          stateRefs.current.isBlocked = !!block;
        }
      }
    };
    
    void checkAuthAndBlockStatus();
  }, [post.id, post.user_id]);

  // ============ MEMOIZOVANI EVENT HANDLERI ============

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, [role='button']")) return;
    router.push(`/post/${post.id}`);
  }, [router, post.id]);

  const handleCommentButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (!stateRefs.current.isAuthenticated) {
      router.push("/login");
      return;
    }
    
    router.push(`/post/${post.id}`);
  }, [router, post.id]);

  const handleProfileLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  }, []);

  const handleShare = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.display_name}`,
          text: post.content.substring(0, 100) + '...',
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  }, [post.display_name, post.content]);

  const handleShareDropdown = useCallback(() => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      void navigator.share({
        title: `Post by ${post.display_name}`,
        text: post.content.substring(0, 100) + '...',
        url: shareUrl,
      });
    } else {
      void navigator.clipboard.writeText(shareUrl);
    }
  }, [post.display_name, post.content]);

  const handleExplainDropdown = useCallback(() => {
    setShowExplanation(true);
    if (!explanation) {
      void handleExplain();
    }
  }, [explanation]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.image_url) {
      setShowImagePreview(true);
    }
  }, [post.image_url]);

  const handleImageError = useCallback(() => {
    setImageLoadError(true);
  }, []);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleFollowStatusChange = useCallback((isFollowing: boolean) => {
    if (onFollowChange && post.user_id) {
      onFollowChange(post.user_id, isFollowing);
    }
  }, [onFollowChange, post.user_id]);

  const handleShowLikes = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (stateRefs.current.likesCount === 0) return;
    
    setShowLikesDialog(true);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setShowImagePreview(false);
  }, []);

  // Funkcija za lajkovanje
  const handleLike = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!stateRefs.current.isAuthenticated) {
      router.push("/login");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      if (stateRefs.current.liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        stateRefs.current.liked = false;
        stateRefs.current.likesCount = Math.max(0, stateRefs.current.likesCount - 1);
        
        setLikedUI(false);
        setLikesCountUI(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("likes")
          .insert({ 
            post_id: post.id, 
            user_id: user.id 
          });
        
        stateRefs.current.liked = true;
        stateRefs.current.likesCount = stateRefs.current.likesCount + 1;
        
        setLikedUI(true);
        setLikesCountUI(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLoading(false);
      router.refresh();
    }
  }, [post.id, router]);

  // Funkcija za repostovanje
  const handleRepost = useCallback(async (e: React.MouseEvent<Element>) => {
    e.stopPropagation();

    if (!stateRefs.current.isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    setReposting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUser,
          content: post.content,
          is_repost: true,
          original_post_id: post.id,
          image_url: post.image_url
        });

      if (error) throw new Error(error.message);

      if (onRepost) {
        await onRepost(post.id);
      }

      router.refresh();
      
    } catch (error) {
      console.error("Error reposting:", error);
    } finally {
      setReposting(false);
    }
  }, [stateRefs.current.isAuthenticated, currentUser, onRepost, post.content, post.id, post.image_url, router]);

  // Funkcija za objašnjavanje sadržaja
  const handleExplain = useCallback(async () => {
    setShowExplanation(true);
    
    if (explanation) return;
    
    setExplaining(true);
    
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.content.substring(0, 1000) })
      });
      
      if (!response.ok) throw new Error('Failed to get explanation');
      
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.error('Explanation error:', error);
    } finally {
      setExplaining(false);
    }
  }, [explanation, post.content]);

  const handleExplainClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void handleExplain();
  }, [handleExplain]);

  // Funkcija za blokiranje korisnika
  const handleBlockUser = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!stateRefs.current.isAuthenticated || !currentUser || currentUser === post.user_id) return;

    setBlocking(true);
    const supabase = createClient();

    try {
      if (stateRefs.current.isBlocked) {
        await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", currentUser)
          .eq("blocked_id", post.user_id);
        
        stateRefs.current.isBlocked = false;
      } else {
        await supabase
          .from("user_blocks")
          .insert({
            blocker_id: currentUser,
            blocked_id: post.user_id
          });
        
        stateRefs.current.isBlocked = true;
        
        if (onUserBlocked) {
          onUserBlocked(post.user_id);
        }
      }
      
      router.refresh();
    } catch (error) {
      console.error("Error blocking/unblocking user:", error);
    } finally {
      setBlocking(false);
    }
  }, [stateRefs.current.isAuthenticated, stateRefs.current.isBlocked, currentUser, onUserBlocked, post.user_id, router]);

  // Memoizovana funkcija za renderovanje slike
  const renderPostImage = useMemo(() => {
    if (!imageUrl || !optimizedImageUrl) return null;

    const aspectRatio = post.image_aspect_ratio || (post.image_width && post.image_height 
      ? post.image_width / post.image_height 
      : 16/9);
    
    let aspectRatioClass = 'aspect-video';
    if (aspectRatio > 2) aspectRatioClass = 'aspect-[21/9]';
    else if (aspectRatio > 1.5) aspectRatioClass = 'aspect-video';
    else if (aspectRatio > 1.2) aspectRatioClass = 'aspect-[4/3]';
    else if (aspectRatio > 0.9) aspectRatioClass = 'aspect-square';
    else aspectRatioClass = 'aspect-[3/4]';

    return (
      <div className="mt-4">
        <div 
          className={cn(
            "relative overflow-hidden rounded-2xl border cursor-pointer group",
            "transition-all duration-300 bg-gradient-to-br from-gray-50 to-white",
            "dark:from-gray-900/50 dark:to-gray-800",
            "hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5",
            variant === 'elevated' && "border-gray-300/50 dark:border-gray-600/50",
            variant === 'minimal' && "border-gray-200 dark:border-gray-700",
            !variant && "border-gray-200 dark:border-gray-700"
          )}
          onClick={handleImageClick}
          onMouseEnter={() => setImageHovered(true)}
          onMouseLeave={() => setImageHovered(false)}
          role="button"
          tabIndex={0}
        >
          <div className={cn(
            "absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
            "opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500",
            imageHovered && "opacity-30"
          )} />
          
          <div className={cn(
            "relative z-10 w-full",
            aspectRatioClass,
            "max-h-[510px]"
          )}>
            {imageLoadError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center 
                            bg-gradient-to-br from-gray-100 to-gray-200 
                            dark:from-gray-800 dark:to-gray-900">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 
                                dark:from-blue-900/30 dark:to-purple-900/30 
                                flex items-center justify-center mb-4">
                    <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Image unavailable
                </p>
              </div>
            ) : (
              <>
                {/* Lazy loaded image */}
                <Image
                  ref={imageRef}
                  src={optimizedImageUrl || imageUrl}
                  alt={`Image posted by ${post.display_name}`}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-700",
                    imageHovered && "scale-105"
                  )}
                  sizes="(max-width: 640px) 90vw, (max-width: 768px) 75vw, 600px"
                  quality={90}
                  loading="lazy"
                  onError={handleImageError}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent 
                              to-transparent opacity-0 group-hover:opacity-100 
                              transition-opacity duration-300" />
              </>
            )}
          </div>
          
          <div className={cn(
            "absolute bottom-4 right-4 z-20 transform transition-all duration-300",
            imageHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}>
            <button 
              className="flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 
                        backdrop-blur-sm rounded-full px-4 py-2 shadow-lg 
                        hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 
                        transition-all duration-200 group/btn border border-gray-200/50 dark:border-gray-700/50"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(e);
              }}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full 
                            bg-gradient-to-r from-blue-500 to-purple-500">
                <Expand className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                View
              </span>
            </button>
          </div>
          
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-xs font-medium text-white">Image</span>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <ImageIcon className="h-3 w-3" />
            Click image to view full size
          </p>
        </div>
      </div>
    );
  }, [
    imageUrl, 
    optimizedImageUrl, 
    imageLoadError, 
    imageHovered, 
    variant, 
    post.display_name, 
    post.image_aspect_ratio, 
    post.image_width, 
    post.image_height,
    handleImageClick,
    handleImageError
  ]);

  // ============ RENDER ============

  return (
    <>
      <div 
        ref={postRef}
        onClick={handleCardClick}
        className={cn(
          "block transition-all duration-300 cursor-pointer relative",
          isAd && "border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/20",
          variant === 'elevated' && "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg",
          variant === 'minimal' && "border-b border-gray-100 dark:border-gray-800",
          !variant && "border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30"
        )}
        role="button"
        tabIndex={0}
      >
        {isAd && (
          <div className="absolute -top-2 left-4 z-20">
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span>AD • PAID</span>
            </div>
          </div>
        )}
        
        <article className={cn(
          compact ? 'p-3' : 'p-4',
          variant === 'elevated' && 'p-6'
        )}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Link 
                href={`/profile/${post.username}`} 
                onClick={handleProfileLinkClick}
                className="inline-block hover:opacity-90 transition-opacity group/avatar"
              >
                <Avatar className={cn(
                  compact ? 'h-10 w-10' : 'h-12 w-12',
                  "border-2 border-white dark:border-gray-900",
                  "group-hover/avatar:border-blue-400 dark:group-hover/avatar:border-blue-500",
                  "transition-colors duration-300 shadow-sm"
                )}>
                  <AvatarImage 
                    src={post.avatar_url || undefined} 
                    alt={post.display_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                    {getInitials(post.display_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <Link
                      href={`/profile/${post.username}`}
                      onClick={handleProfileLinkClick}
                      className="font-bold hover:underline text-gray-900 dark:text-gray-100 text-sm md:text-base truncate max-w-[120px] md:max-w-none group/name"
                    >
                      <span className="group-hover/name:text-blue-600 dark:group-hover/name:text-blue-400 transition-colors">
                        {post.display_name}
                      </span>
                    </Link>
                    
                    <Link
                      href={`/profile/${post.username}`}
                      onClick={handleProfileLinkClick}
                      className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[100px] md:max-w-none ml-0.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      @{post.username}
                    </Link>
                    
                    <span className="text-gray-400 dark:text-gray-600 mx-1">·</span>
                    
                    <span 
                      className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="md:hidden">{formattedDateMobile}</span>
                      <span className="hidden md:inline">
                        {formattedDate}
                      </span>
                    </span>
                    
                    {post.is_public !== false && (
                      <Globe className="h-3.5 w-3.5 text-gray-400 ml-1" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ProvenanceBadge 
                    provenance={post.provenance} 
                    postId={post.id} 
                  />
                  
                  {isAd && (
                    <Badge 
                      variant="default" 
                      className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold animate-pulse"
                    >
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">AD</span>
                      </span>
                    </Badge>
                  )}
                  
                  {showFollowButton && stateRefs.current.isAuthenticated && currentUser && currentUser !== post.user_id && (
                    <div className="hidden sm:block" onClick={stopPropagation}>
                      <FollowButton
                        followerId={currentUser}
                        followingId={post.user_id}
                        isFollowing={isFollowing}
                        onFollowChange={handleFollowStatusChange}
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4"
                      />
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                        onClick={stopPropagation}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={stopPropagation} className="w-56">
                      {isAd && (
                        <div className="px-2 py-1.5 mb-1 border-b border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                            <DollarSign className="h-3 w-3" />
                            <span>Ovo je plaćena reklama</span>
                          </div>
                        </div>
                      )}
                      
                      <DropdownMenuItem onClick={handleShareDropdown} className="cursor-pointer">
                        <Share className="h-4 w-4 mr-2" />
                        Share post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExplainDropdown} className="cursor-pointer">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Explain with AI
                      </DropdownMenuItem>
                      {stateRefs.current.isAuthenticated && currentUser !== post.user_id && (
                        <DropdownMenuItem 
                          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleRepost(e as unknown as React.MouseEvent<Element>);
                          }} 
                          disabled={reposting}
                          className="cursor-pointer"
                        >
                          <Repeat className="h-4 w-4 mr-2" />
                          {reposting ? 'Reposting...' : 'Repost'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {stateRefs.current.isAuthenticated && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save post
                        </DropdownMenuItem>
                      )}
                      
                      {stateRefs.current.isAuthenticated && currentUser && currentUser !== post.user_id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={handleBlockUser}
                            disabled={blocking}
                            className={`cursor-pointer ${stateRefs.current.isBlocked ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            {blocking ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : stateRefs.current.isBlocked ? (
                              <ShieldCheck className="h-4 w-4 mr-2" />
                            ) : (
                              <Ban className="h-4 w-4 mr-2" />
                            )}
                            {stateRefs.current.isBlocked ? `Unblock @${post.username}` : `Block @${post.username}`}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mb-4">
                <p className="whitespace-pre-wrap text-pretty break-words text-gray-900 dark:text-gray-100 text-[15px] md:text-[16px] leading-relaxed font-normal">
                  {post.content}
                </p>
                
                {renderPostImage}
              </div>

              {post.impressions && post.impressions > 0 && (
                <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400 text-sm mb-3">
                  <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <Eye className="h-4 w-4" />
                    <span>{post.impressions.toLocaleString()}</span>
                  </div>
                  {post.likes_count > 0 && (
                    <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                      <TrendingUp className="h-4 w-4" />
                      <span>{(post.likes_count / post.impressions * 100).toFixed(1)}% engagement</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between max-w-md -ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400",
                    "hover:text-blue-600 dark:hover:text-blue-400 rounded-full"
                  )}
                  onClick={handleCommentButtonClick}
                  title="Reply"
                >
                  <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform mr-2" />
                  {post.comments_count > 0 && (
                    <span className="text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {post.comments_count}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-600 dark:text-gray-400",
                    "hover:text-green-600 dark:hover:text-green-400 rounded-full"
                  )}
                  onClick={handleRepost}
                  disabled={reposting || !stateRefs.current.isAuthenticated}
                  title="Repost"
                >
                  <Repeat className={cn(
                    "h-5 w-5 group-hover:scale-110 transition-transform mr-2",
                    reposting && "animate-spin"
                  )} />
                  {reposting ? 'Reposting' : 'Repost'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 rounded-full",
                    likedUI 
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                  )}
                  onClick={handleLike}
                  disabled={loading || (!stateRefs.current.isAuthenticated && !likedUI)}
                  title={likedUI ? "Unlike" : "Like"}
                >
                  <Heart className={cn(
                    "h-5 w-5 group-hover:scale-110 transition-transform mr-2",
                    likedUI && "fill-current"
                  )} />
                  {likesCountUI > 0 && (
                    <span 
                      className={cn(
                        "text-sm",
                        likedUI ? 'text-red-500' : 'text-gray-600 dark:text-gray-400',
                        "group-hover:text-red-500 cursor-pointer"
                      )}
                      onClick={handleShowLikes}
                      role="button"
                      tabIndex={0}
                    >
                      {likesCountUI}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400",
                    "hover:text-blue-600 dark:hover:text-blue-400 rounded-full"
                  )}
                  onClick={handleShare}
                  title="Share"
                >
                  <Share className="h-5 w-5 group-hover:scale-110 transition-transform mr-2" />
                  Share
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 dark:text-gray-400",
                    "hover:text-purple-600 dark:hover:text-purple-400 rounded-full"
                  )}
                  onClick={handleExplainClick}
                  title="Explain with AI"
                >
                  <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform mr-2" />
                  AI
                </Button>
              </div>

              {showFollowButton && stateRefs.current.isAuthenticated && currentUser && currentUser !== post.user_id && (
                <div className="sm:hidden mt-3" onClick={stopPropagation}>
                  <FollowButton
                    followerId={currentUser}
                    followingId={post.user_id}
                    isFollowing={isFollowing}
                    onFollowChange={handleFollowStatusChange}
                    size="sm"
                    variant="outline"
                    className="rounded-full w-full"
                  />
                </div>
              )}
              
              {isAd && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      <span className="font-medium">Paid Content • Sponsored</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {post.image_url && showImagePreview && (
        <ImagePreview
          imageUrl={imageUrl!}
          alt={`Image posted by ${post.display_name}`}
          onClose={handleCloseImagePreview}
        />
      )}

      <LikesList
        postId={post.id}
        open={showLikesDialog}
        onOpenChange={setShowLikesDialog}
      />

      {showExplanation && (
        <AlertDialog open={showExplanation} onOpenChange={setShowExplanation}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">AI Explanation</div>
                  <AlertDialogDescription className="text-sm">
                    Analysis of post by @{post.username}
                  </AlertDialogDescription>
                </div>
              </AlertDialogTitle>
            </AlertDialogHeader>
            
            <div className="py-4">
              {explaining ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
                  </div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                    AI is analyzing the post...
                  </p>
                </div>
              ) : explanation ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {explanation}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">Close</AlertDialogCancel>
              {explanation && (
                <Button
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(explanation);
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Explanation
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom shouldComponentUpdate za sprečavanje nepotrebnih re-rendera
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.user_has_liked === nextProps.post.user_has_liked &&
    prevProps.isCurrentUserFollowing === nextProps.isCurrentUserFollowing &&
    prevProps.showFollowButton === nextProps.showFollowButton &&
    prevProps.compact === nextProps.compact &&
    prevProps.variant === nextProps.variant &&
    prevProps.hideAdBadges === nextProps.hideAdBadges
  );
});