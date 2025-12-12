// components/post/post-card.tsx
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
  X
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
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  image_url: string | null; // OVO MORA BITI string | null
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
}

interface PostCardProps {
  post: Post;
  showFollowButton?: boolean;
  currentUserId?: string;
  isCurrentUserFollowing?: boolean;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  compact?: boolean;
  onRepost?: (postId: string) => Promise<void>;
}

interface ProvenanceBadgeProps {
  provenance?: PostProvenance;
  postId: string;
}

// Provenance Badge Component
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
      {/* Status badge */}
      {status === 'verified' && (
        <Badge variant="outline" className="text-xs gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Verified Source
        </Badge>
      )}
      
      {status === 'unverified' && (
        <Badge variant="outline" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3 text-amber-500" />
          Unverified
        </Badge>
      )}
      
      {/* AI generated */}
      {isAI && (
        <Badge variant="outline" className="text-xs gap-1 bg-amber-50 dark:bg-amber-900/20">
          <Bot className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          AI Generated
        </Badge>
      )}
      
      {/* Repost */}
      {isRepost && (
        <Badge variant="outline" className="text-xs gap-1">
          <Repeat className="h-3 w-3 text-blue-500" />
          Repost
          {repostChainLength > 1 && (
            <span className="text-xs opacity-70">×{repostChainLength}</span>
          )}
        </Badge>
      )}
      
      {/* Edit */}
      {isEdit && (
        <Badge variant="outline" className="text-xs gap-1">
          <Edit className="h-3 w-3 text-purple-500" />
          Edited
        </Badge>
      )}
    </div>
  );
}

// Helper functions
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

const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const timestamp = Date.now().toString(36);
  return `hash-${Math.abs(hash).toString(36)}-${timestamp}`;
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

// Image Preview Component
interface ImagePreviewProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

function ImagePreview({ imageUrl, alt, onClose }: ImagePreviewProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleClose = (): void => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    console.log('ImagePreview URL:', imageUrl);
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [imageUrl]);

  if (!isOpen) return <></>;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 h-10 w-10 bg-black/50 text-white hover:bg-black/70"
          onClick={handleClose}
          aria-label="Close image preview"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="relative w-full h-[80vh] rounded-lg overflow-hidden">
          {imageError ? (
            <div className="flex items-center justify-center h-full w-full bg-gray-800">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-white">Unable to load image</p>
                <p className="text-white/70 text-sm mt-2">{imageUrl}</p>
              </div>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              onError={() => {
                console.error('Failed to load image in preview:', imageUrl);
                setImageError(true);
              }}
            />
          )}
        </div>
        
        <div className="mt-4 text-center text-white/80 text-sm">
          Click outside the image or press ESC to close
        </div>
      </div>
    </div>
  );
}

// Main PostCard Component
export function PostCard({ 
  post, 
  showFollowButton = false,
  currentUserId,
  isCurrentUserFollowing = false,
  onFollowChange,
  compact = false,
  onRepost
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

  // Image preview state
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  // Debug logging
  useEffect(() => {
    console.log('PostCard render:', {
      id: post.id,
      hasImage: !!post.image_url,
      image_url: post.image_url,
      content_length: post.content.length
    });
  }, [post.id, post.image_url, post.content]);

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

  // Current user (priority: prop > state)
  const currentUser = currentUserId || authUserId;
  const isFollowing = isCurrentUserFollowing || false;

  // Like handler
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

  // Repost handler
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
          image_url: post.image_url // Preserve the image URL
        });

      if (error) {
        throw new Error(error.message);
      }

      if (onRepost) {
        await onRepost(post.id);
      }

      console.log('Reposted successfully');
      router.refresh();
      
    } catch (error) {
      console.error("Error reposting:", error);
    } finally {
      setReposting(false);
    }
  };

  // Get repost chain function
  const getRepostChain = async (postId: string): Promise<string[]> => {
    const supabase = createClient();
    const chain: string[] = [];
    
    let current = postId;
    let iterations = 0;
    
    while (iterations < 10) { // Prevent infinite loop
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

  // AI Explanation handler
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
    setShowImagePreview(true);
  };

  const handleImageError = (): void => {
    console.error('Failed to load post image:', post.image_url);
    setImageLoadError(true);
  };

  const stopPropagation = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Render post image
// components/post/post-card.tsx - ISPRAVLJENA RENDER IMAGE FUNKCIJA
const renderPostImage = (): React.ReactNode => {
  // ISPRAVKA: Eksplicitno provjeri za undefined
  if (!post.image_url || post.image_url === undefined) {
    console.log('No image for post:', post.id);
    return null;
  }

  console.log('Rendering image for post:', {
    id: post.id,
    url: post.image_url,
    valid: post.image_url.startsWith('http')
  });

  return (
    <div className="mt-3 relative aspect-video overflow-hidden rounded-lg border">
      <img
        src={post.image_url}
        alt={`Post image by ${post.display_name}`}
        className="w-full h-full object-cover"
        onLoad={() => console.log('✅ Image loaded:', post.image_url)}
        onError={(e) => {
          console.error('❌ Image failed to load:', post.image_url);
          // Možete dodati fallback UI ako želite
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
};

  return (
    <>
      <div 
        onClick={handleCardClick}
        className="block transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer border-b border-gray-200 dark:border-gray-800 relative"
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/post/${post.id}`);
          }
        }}
      >
        <article className={`${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Link 
                href={`/profile/${post.username}`} 
                onClick={handleProfileLinkClick}
                className="inline-block hover:opacity-90 transition-opacity"
                aria-label={`View ${post.display_name}'s profile`}
              >
                <Avatar className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} border border-gray-300 dark:border-gray-700`}>
                  <AvatarImage 
                    src={post.avatar_url || undefined} 
                    alt={post.display_name}
                    className="object-cover"
                    onError={(e) => {
                      console.error('Failed to load avatar:', post.avatar_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                    {getInitials(post.display_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>

            <div className="flex-1 min-w-0">
              {/* User info row */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1">
                    <Link
                      href={`/profile/${post.username}`}
                      onClick={handleProfileLinkClick}
                      className="font-bold hover:underline text-gray-900 dark:text-gray-100 text-sm md:text-base truncate max-w-[120px] md:max-w-none"
                    >
                      {post.display_name}
                    </Link>
                    
                    <Link
                      href={`/profile/${post.username}`}
                      onClick={handleProfileLinkClick}
                      className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[100px] md:max-w-none ml-1"
                    >
                      @{post.username}
                    </Link>
                    
                    <span className="text-gray-500 dark:text-gray-400 mx-1">·</span>
                    
                    <span 
                      className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap"
                      title={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    >
                      <span className="md:hidden">{formatDateMobile(post.created_at)}</span>
                      <span className="hidden md:inline">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </span>
                    
                    {/* Public/Private badge */}
                    {post.is_public !== false && (
                      <Globe className="h-3 w-3 text-gray-400 ml-1" />
                    )}
                  </div>
                </div>

                {/* Follow button, menu, and provenance badges */}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                        }
                      }}
                      role="none"
                    >
                      <FollowButton
                        followerId={currentUser}
                        followingId={post.user_id}
                        isFollowing={isFollowing}
                        onFollowChange={handleFollowStatusChange}
                        size="sm"
                        variant="outline"
                      />
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={stopPropagation}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={stopPropagation}>
                      <DropdownMenuItem onClick={handleShareDropdown}>
                        <Share className="h-4 w-4 mr-2" />
                        Share post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExplainDropdown}>
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
                        >
                          <Repeat className="h-4 w-4 mr-2" />
                          {reposting ? 'Reposting...' : 'Repost'}
                        </DropdownMenuItem>
                      )}
                      {isAuthenticated && (
                        <DropdownMenuItem>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Bookmark
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Post content */}
              <div className="mb-3">
                <p className="whitespace-pre-wrap text-pretty break-words text-gray-900 dark:text-gray-100 text-sm md:text-[15px] leading-relaxed">
                  {post.content}
                </p>
                
                {/* Post image */}
                {renderPostImage()}
              </div>

              {/* Stats row */}
              {post.impressions && post.impressions > 0 && (
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>{post.impressions.toLocaleString()} views</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between max-w-md">
                {/* Comment button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 ${compact ? 'h-8 w-8' : ''}`}
                  onClick={handleCommentButtonClick}
                  title="Reply"
                >
                  <MessageCircle className={`h-4 w-4 group-hover:scale-110 transition-transform ${compact ? 'h-3.5 w-3.5' : ''}`} />
                  {post.comments_count > 0 && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {post.comments_count}
                    </span>
                  )}
                </Button>

                {/* Repost button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group h-9 w-9 p-0 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 ${compact ? 'h-8 w-8' : ''}`}
                  onClick={handleRepost}
                  disabled={reposting || !isAuthenticated}
                  title="Repost"
                >
                  <Repeat className={`h-4 w-4 group-hover:scale-110 transition-transform ${compact ? 'h-3.5 w-3.5' : ''}`} />
                </Button>

                {/* Like button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group h-9 w-9 p-0 ${
                    liked 
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600' 
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                  } ${compact ? 'h-8 w-8' : ''}`}
                  onClick={handleLike}
                  disabled={loading || (!isAuthenticated && !liked)}
                  title={liked ? "Unlike" : "Like"}
                >
                  <Heart className={`h-4 w-4 group-hover:scale-110 transition-transform ${liked ? 'fill-current' : ''} ${compact ? 'h-3.5 w-3.5' : ''}`} />
                  {likesCount > 0 && (
                    <span 
                      className={`ml-1 text-xs ${liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'} group-hover:text-red-500 cursor-pointer`}
                      onClick={handleShowLikes}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShowLikes(e as unknown as React.MouseEvent<HTMLButtonElement>);
                        }
                      }}
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
                  className={`group h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 ${compact ? 'h-8 w-8' : ''}`}
                  onClick={handleShare}
                  title="Share"
                >
                  <Share className={`h-4 w-4 group-hover:scale-110 transition-transform ${compact ? 'h-3.5 w-3.5' : ''}`} />
                </Button>

                {/* Explain button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group h-9 w-9 p-0 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 ${compact ? 'h-8 w-8' : ''}`}
                  onClick={handleExplainClick}
                  title="Explain with AI"
                >
                  <Sparkles className={`h-4 w-4 group-hover:scale-110 transition-transform ${compact ? 'h-3.5 w-3.5' : ''}`} />
                </Button>
              </div>

              {/* Mobile follow button */}
              {showFollowButton && isAuthenticated && currentUser && currentUser !== post.user_id && (
                <div 
                  className="sm:hidden mt-3" 
                  onClick={stopPropagation}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                  role="none"
                >
                  <FollowButton
                    followerId={currentUser}
                    followingId={post.user_id}
                    isFollowing={isFollowing}
                    onFollowChange={handleFollowStatusChange}
                    size="sm"
                    variant="outline"
                  />
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {/* Likes List Dialog */}
      <LikesList
        postId={post.id}
        open={showLikesDialog}
        onOpenChange={setShowLikesDialog}
      />

      {/* Explanation Dialog */}
      <AlertDialog open={showExplanation} onOpenChange={setShowExplanation}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Explanation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Explanation of post by @{post.username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            {explaining ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  AI is analyzing the post...
                </p>
              </div>
            ) : explanationError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-400">{explanationError}</p>
              </div>
            ) : explanation ? (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {explanation}
                </p>
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <p>Powered by DeepSeek AI</p>
                  <p className="mt-1">AI-generated content may not always be accurate</p>
                </div>
              </div>
            ) : null}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {explanation && (
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(explanation);
                }}
              >
                Copy Explanation
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}