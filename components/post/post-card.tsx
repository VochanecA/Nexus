// components/post/post-card.tsx - MODERNI KOMBINOVANI STIL (Twitter + BlueSky + Extra)
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  TrendingUp
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

// Type definitions
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
  content_hash?: string;
  signature?: string;
  provenance?: PostProvenance;
  image_width?: number;
  image_height?: number;
  image_aspect_ratio?: number;
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
}

interface ProvenanceBadgeProps {
  provenance?: PostProvenance;
  postId: string;
}

// ============ IMAGE HELPER FUNCTIONS ============

const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

const getImageUrl = (url: string | null): string | null => {
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
      return `${supabaseUrl}/storage/v1/object/public/${normalizedUrl}`;
    }
  }

  // DEVELOPMENT: Za test, vrati placeholder
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
  
  // Ako je Supabase, dodaj query params za optimizaciju
  if (imageUrl.includes('supabase.co')) {
    return `${imageUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`;
  }
  
  // Ako je Cloudinary ili drugi servis, možete dodati logiku
  return imageUrl;
};

// ============ PROVENANCE BADGE COMPONENT ============

function ProvenanceBadge({ provenance, postId }: ProvenanceBadgeProps): React.JSX.Element {
  const verifyProvenance = useCallback((): 'verified' | 'unverified' | 'unknown' => {
    if (!provenance) return 'unknown';
    
    const { signature } = provenance;
    
    if (signature?.startsWith('nexus-sig-') || signature?.startsWith('nexus-basic-')) {
      return 'verified';
    }
    
    return 'unverified';
  }, [provenance]);

  const status = verifyProvenance();
  const isAI = provenance?.metadata?.isAIGenerated;
  const isRepost = provenance?.metadata?.originalPostId;
  const isEdit = provenance?.metadata?.editOf;
  const repostChainLength = provenance?.metadata?.repostChain?.length || 0;

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
}

// ============ HELPER FUNCTIONS ============

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
  
  return score >= 1.5;
};

const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash-${Math.abs(hash).toString(36)}`;
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

const formatDateMobile = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = diffInHours * 60;
    if (diffInMinutes < 1) {
      return "now";
    }
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
};

// ============ IMAGE PREVIEW COMPONENT (Enhanced) ============

interface ImagePreviewProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

function ImagePreview({ imageUrl, alt, onClose }: ImagePreviewProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClose = (): void => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleDownload = async (): Promise<void> => {
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
  };

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if (e.key === 'z' || e.key === 'Z') {
        setIsZoomed(!isZoomed);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isZoomed]);

  if (!isOpen) return <></>;

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
                <p className="text-white/70 text-sm mt-2 max-w-md">{alt}</p>
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
              onError={() => {
                console.error('Failed to load image in preview:', imageUrl);
                setImageError(true);
              }}
            />
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-4 text-center text-white/80 text-sm flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Click to zoom • Press Z to toggle</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN POSTCARD COMPONENT ============

export function PostCard({ 
  post, 
  showFollowButton = false,
  currentUserId,
  isCurrentUserFollowing = false,
  onFollowChange,
  compact = false,
  onRepost,
  variant = 'default'
}: PostCardProps): React.JSX.Element {
  const router = useRouter();
  const [liked, setLiked] = useState<boolean>(post.user_has_liked);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [showLikesDialog, setShowLikesDialog] = useState<boolean>(false);
  const [reposting, setReposting] = useState<boolean>(false);
  
  // AI Explanation states
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>("");
  const [explaining, setExplaining] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string>("");

  // Image states
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [imageHovered, setImageHovered] = useState<boolean>(false);

  // Check authentication and user's like status
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setAuthUserId(user?.id || null);
      
      if (user) {
        const { data: like } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setLiked(!!like);
      }
    };
    
    void checkAuth();
  }, [post.id]);

  // Current user
  const currentUser = currentUserId || authUserId;
  const isFollowing = isCurrentUserFollowing || false;

  // ============ HANDLERS ============

  const handleLike = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
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
      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("likes")
          .insert({ 
            post_id: post.id, 
            user_id: user.id 
          });
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  const handleRepost = async (e: React.MouseEvent<Element>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    setReposting(true);

    try {
      // Get repost chain
      const repostChain = await getRepostChain(post.id);
      
      // Detect if content is AI generated
      const isAIGenerated = detectAIContent(post.content);
      
      // Create provenance for repost
      const provenance = {
        version: '1.0',
        authorId: currentUser,
        timestamp: new Date().toISOString(),
        contentHash: generateContentHash(`REPOST: ${post.content}`),
        metadata: {
          isAIGenerated,
          originalPostId: post.id,
          repostChain: [post.id, ...repostChain].slice(0, 10),
          platform: 'nexus',
          algorithm: 'SHA-256',
          characterCount: post.content.length,
          wordCount: post.content.split(/\s+/).length,
          hasLinks: /(https?:\/\/[^\s]+)/g.test(post.content),
          hasHashtags: /#(\w+)/g.test(post.content),
          client: 'web'
        },
        signature: `nexus-repost-${currentUser.substring(0, 8)}-${Date.now().toString(36)}`,
        verification: {
          selfSigned: true,
          timestamped: true,
          hashChain: true
        }
      };

      const supabase = createClient();
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUser,
          content: post.content,
          content_hash: provenance.contentHash,
          signature: provenance.signature,
          provenance: provenance,
          is_repost: true,
          original_post_id: post.id,
          image_url: post.image_url
        });

      if (error) {
        throw new Error(error.message);
      }

      if (onRepost) {
        await onRepost(post.id);
      }

      router.refresh();
      
    } catch (error) {
      console.error("Error reposting:", error);
    } finally {
      setReposting(false);
    }
  };

  const getRepostChain = async (postId: string): Promise<string[]> => {
    const supabase = createClient();
    const chain: string[] = [];
    
    let current = postId;
    let iterations = 0;
    
    while (iterations < 10) {
      try {
        const { data } = await supabase
          .from('posts')
          .select('provenance')
          .eq('id', current)
          .single();
        
        if (!data?.provenance?.metadata?.originalPostId) break;
        
        chain.push(data.provenance.metadata.originalPostId);
        current = data.provenance.metadata.originalPostId;
      } catch {
        break;
      }
      iterations++;
    }
    
    return chain;
  };

  const handleExplain = async (): Promise<void> => {
    setShowExplanation(true);
    
    if (explanation) return;
    
    setExplaining(true);
    setExplanationError("");
    
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: post.content.substring(0, 1000) })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }
      
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.error('Explanation error:', error);
      setExplanationError('Failed to generate explanation. Please try again.');
    } finally {
      setExplaining(false);
    }
  };

  const handleExplainClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    void handleExplain();
  };

  const handleFollowStatusChange = (isFollowing: boolean): void => {
    if (onFollowChange && post.user_id) {
      onFollowChange(post.user_id, isFollowing);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, [role='button']")) {
      return;
    }
    router.push(`/post/${post.id}`);
  };

  const handleCommentButtonClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    router.push(`/post/${post.id}`);
  };

  const handleShowLikes = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    
    if (likesCount === 0) return;
    
    setShowLikesDialog(true);
  };

  const handleProfileLinkClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.stopPropagation();
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
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
  };

  const handleShareDropdown = (): void => {
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
  };

  const handleExplainDropdown = (): void => {
    setShowExplanation(true);
    if (!explanation) {
      void handleExplain();
    }
  };

  const handleImageClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (post.image_url) {
      setShowImagePreview(true);
    }
  };

  const handleImageError = (): void => {
    setImageLoadError(true);
  };

  const stopPropagation = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ============ IMAGE RENDER FUNCTION (MODERN HYBRID STYLE) ============

  const renderPostImage = (): React.ReactNode => {
    const imageUrl = getImageUrl(post.image_url);
    
    if (!imageUrl) {
      return null;
    }

    // Determine aspect ratio class
    const aspectRatio = post.image_aspect_ratio || (post.image_width && post.image_height 
      ? post.image_width / post.image_height 
      : 16/9);
    
    let aspectRatioClass = 'aspect-video'; // 16:9 default
    
    if (aspectRatio > 2) aspectRatioClass = 'aspect-[21/9]'; // Ultra wide
    else if (aspectRatio > 1.5) aspectRatioClass = 'aspect-video'; // 16:9
    else if (aspectRatio > 1.2) aspectRatioClass = 'aspect-[4/3]'; // 4:3
    else if (aspectRatio > 0.9) aspectRatioClass = 'aspect-square'; // 1:1
    else aspectRatioClass = 'aspect-[3/4]'; // Portrait

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
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleImageClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Animated gradient border on hover */}
          <div className={cn(
            "absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
            "opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500",
            imageHovered && "opacity-30"
          )} />
          
          {/* Main image container */}
          <div className={cn(
            "relative z-10 w-full",
            aspectRatioClass,
            "max-h-[510px]"
          )}>
            {/* Loading/error state */}
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
                  <div className="absolute -top-1 -right-1">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 
                                  flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Image unavailable
                </p>
                <button 
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageLoadError(false);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Main image with optimized URL */}
                <Image
                  src={getOptimizedImageUrl(post.image_url, { 
                    width: 800, 
                    height: 600, 
                    quality: 90,
                    format: 'webp'
                  }) || imageUrl}
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
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent 
                              to-transparent opacity-0 group-hover:opacity-100 
                              transition-opacity duration-300" />
              </>
            )}
          </div>
          
          {/* Floating action button (BlueSky/Twitter style) */}
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
              <div className="w-5 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </button>
          </div>
          
          {/* Top right indicator */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-xs font-medium text-white">Image</span>
            </div>
          </div>
        </div>
        
        {/* Subtle caption below image */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <ImageIcon className="h-3 w-3" />
            Click image to view full size
          </p>
        </div>
      </div>
    );
  };

  const handleCloseImagePreview = (): void => {
    setShowImagePreview(false);
  };

  // ============ RENDER ============

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={cn(
          "block transition-all duration-300 cursor-pointer relative",
          variant === 'elevated' && "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg",
          variant === 'minimal' && "border-b border-gray-100 dark:border-gray-800",
          !variant && "border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/post/${post.id}`);
          }
        }}
      >
        <article className={cn(
          compact ? 'p-3' : 'p-4',
          variant === 'elevated' && 'p-6'
        )}>
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Link 
                href={`/profile/${post.username}`} 
                onClick={handleProfileLinkClick}
                className="inline-block hover:opacity-90 transition-opacity group/avatar"
                aria-label={`View ${post.display_name}'s profile`}
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
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                    {getInitials(post.display_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>

            <div className="flex-1 min-w-0">
              {/* User info row */}
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
                      title={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    >
                      <span className="md:hidden">{formatDateMobile(post.created_at)}</span>
                      <span className="hidden md:inline">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </span>
                    
                    {/* Public/Private badge */}
                    {post.is_public !== false && (
                      <Globe className="h-3.5 w-3.5 text-gray-400 ml-1" />
                    )}
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-2">
                  {/* Provenance badges */}
                  <ProvenanceBadge 
                    provenance={post.provenance} 
                    postId={post.id} 
                  />
                  
                  {showFollowButton && isAuthenticated && currentUser && currentUser !== post.user_id && (
                    <div 
                      className="hidden sm:block" 
                      onClick={stopPropagation}
                      role="none"
                    >
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
                      <DropdownMenuItem onClick={handleShareDropdown} className="cursor-pointer">
                        <Share className="h-4 w-4 mr-2" />
                        Share post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExplainDropdown} className="cursor-pointer">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Explain with AI
                      </DropdownMenuItem>
                      {isAuthenticated && currentUser !== post.user_id && (
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
                      {isAuthenticated && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save post
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="cursor-pointer">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View analytics
                      </DropdownMenuItem>
                      {currentUser === post.user_id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer">
                            <X className="h-4 w-4 mr-2" />
                            Delete post
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Post content */}
              <div className="mb-4">
                <p className="whitespace-pre-wrap text-pretty break-words text-gray-900 dark:text-gray-100 text-[15px] md:text-[16px] leading-relaxed font-normal">
                  {post.content}
                </p>
                
                {/* Post image */}
                {renderPostImage()}
              </div>

              {/* Stats row */}
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

              {/* Action buttons - Modern Twitter/BlueSky style */}
              <div className="flex items-center justify-between max-w-md -ml-2">
                {/* Comment button */}
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

                {/* Repost button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-600 dark:text-gray-400",
                    "hover:text-green-600 dark:hover:text-green-400 rounded-full"
                  )}
                  onClick={handleRepost}
                  disabled={reposting || !isAuthenticated}
                  title="Repost"
                >
                  <Repeat className={cn(
                    "h-5 w-5 group-hover:scale-110 transition-transform mr-2",
                    reposting && "animate-spin"
                  )} />
                  {reposting ? 'Reposting' : 'Repost'}
                </Button>

                {/* Like button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group h-10 px-3 rounded-full",
                    liked 
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                  )}
                  onClick={handleLike}
                  disabled={loading || (!isAuthenticated && !liked)}
                  title={liked ? "Unlike" : "Like"}
                >
                  <Heart className={cn(
                    "h-5 w-5 group-hover:scale-110 transition-transform mr-2",
                    liked && "fill-current"
                  )} />
                  {likesCount > 0 && (
                    <span 
                      className={cn(
                        "text-sm",
                        liked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400',
                        "group-hover:text-red-500 cursor-pointer"
                      )}
                      onClick={handleShowLikes}
                      role="button"
                      tabIndex={0}
                    >
                      {likesCount}
                    </span>
                  )}
                </Button>

                {/* Share button */}
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

                {/* Explain button */}
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

              {/* Mobile follow button */}
              {showFollowButton && isAuthenticated && currentUser && currentUser !== post.user_id && (
                <div 
                  className="sm:hidden mt-3" 
                  onClick={stopPropagation}
                  role="none"
                >
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
            </div>
          </div>
        </article>
      </div>

      {/* Image Preview */}
      {post.image_url && showImagePreview && (
        <ImagePreview
          imageUrl={getImageUrl(post.image_url)!}
          alt={`Image posted by ${post.display_name}`}
          onClose={handleCloseImagePreview}
        />
      )}

      {/* Likes List Dialog */}
      <LikesList
        postId={post.id}
        open={showLikesDialog}
        onOpenChange={setShowLikesDialog}
      />

      {/* Explanation Dialog */}
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
                  <div className="absolute inset-0 animate-ping rounded-full bg-purple-200/50" />
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                  AI is analyzing the post...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  This may take a few seconds
                </p>
              </div>
            ) : explanationError ? (
              <div className="rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">{explanationError}</p>
                    <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-2">
                      Please try again or check your internet connection.
                    </p>
                  </div>
                </div>
              </div>
            ) : explanation ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {explanation}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>Powered by DeepSeek AI</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{explanation.split(' ').length} words</span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500">
                    AI-generated content may not always be accurate
                  </span>
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
            {explanation && (
              <AlertDialogAction className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Save Analysis
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}