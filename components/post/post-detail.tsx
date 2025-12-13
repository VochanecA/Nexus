// components/post/post-detail.tsx - KOMPLETAN SA SLIKOM
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Heart, 
  MessageCircle, 
  ArrowLeft, 
  ImageIcon, 
  AlertCircle, 
  X, 
  Globe, 
  MoreVertical, 
  Share, 
  Bookmark, 
  Sparkles,
  Home
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  likes_count: number
  comments_count: number
  user_has_liked: boolean
  is_public?: boolean
}

interface PostDetailProps {
  post: Post
}

// Image Preview Component
interface ImagePreviewProps {
  imageUrl: string
  alt: string
  onClose: () => void
}

function ImagePreview({ imageUrl, alt, onClose }: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false)

  // Handle ESC key press and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-7xl max-h-[95vh] w-full">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 h-10 w-10 bg-black/50 text-white hover:bg-black/70"
          onClick={onClose}
          aria-label="Close image preview"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="relative w-full h-[90vh] rounded-lg overflow-hidden">
          {imageError ? (
            <div className="flex items-center justify-center h-full w-full bg-gray-800">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-white">Unable to load image</p>
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
              quality={100}
              onError={() => setImageError(true)}
            />
          )}
        </div>
        
        <div className="mt-4 text-center text-white/80 text-sm">
          Click outside or press ESC to close
        </div>
      </div>
    </div>
  )
}

// Image URL normalization function
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  if (url.trim() === '') return null;
  return url.trim();
};

export function PostDetail({ post }: PostDetailProps) {
  const router = useRouter()
  const [liked, setLiked] = useState(post.user_has_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [loading, setLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)

  console.log('🖼️ PostDetail rendering with post:', {
    id: post.id,
    hasImage: !!post.image_url,
    image_url: post.image_url,
    content: post.content?.substring(0, 50)
  })

  const handleLike = async () => {
    setLoading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    try {
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id)
        setLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: user.id })
        setLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const handleImageClick = () => {
    const imageUrl = normalizeImageUrl(post.image_url)
    if (imageUrl && !imageLoadError) {
      setShowImagePreview(true)
    }
  }

  // Render post image
  const renderPostImage = () => {
    // Normalizuj image_url
    const imageUrl = normalizeImageUrl(post.image_url)
    
    if (!imageUrl) {
      console.log('ℹ️ No image for post:', post.id)
      return null
    }

    // Validacija URL-a
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.error('❌ Invalid image URL format:', imageUrl)
      return null
    }

    console.log('✅ Rendering image for post:', {
      id: post.id,
      url: imageUrl
    })

    return (
      <div 
        className="mt-4 relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-95 transition-opacity"
        onClick={handleImageClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleImageClick()
          }
        }}
        aria-label="View full size image"
      >
        {imageLoadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <ImageIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Failed to load image</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation()
                setImageLoadError(false)
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <Image
              src={imageUrl}
              alt={`Post image by ${post.display_name}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
              quality={90}
              priority
              onLoad={() => {
                console.log('✅ Post detail image loaded:', imageUrl)
              }}
              onError={(e) => {
                console.error('❌ Post detail image failed:', imageUrl)
                setImageLoadError(true)
              }}
            />
          </div>
        )}
        
        {!imageLoadError && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Click to expand
          </div>
        )}
      </div>
    )
  }

  const getInitials = (name: string): string => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.display_name}`,
          text: post.content.substring(0, 100) + '...',
          url: shareUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <>
      {/* Sticky Header - Mobile Optimized */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
            <h1 className="text-lg font-semibold">Post</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {post.is_public !== false && (
              <Globe className="h-4 w-4 text-gray-400" />
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              asChild
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="sr-only">Return to home</span>
              </Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="h-4 w-4 mr-2" />
                  Share post
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmark
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Explain with AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-background pb-20">
        <article className="p-4">
          {/* User Info - Mobile Optimized */}
          <div className="flex gap-3 mb-4">
            <Link href={`/profile/${post.username}`} className="flex-shrink-0">
              <Avatar className="h-10 w-10 border">
                <AvatarImage 
                  src={post.avatar_url || undefined} 
                  alt={post.display_name} 
                  className="object-cover"
                  onError={(e) => {
                    console.error('Failed to load avatar image')
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm">
                  {getInitials(post.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-1">
                <Link 
                  href={`/profile/${post.username}`}
                  className="font-bold hover:underline text-gray-900 dark:text-gray-100 truncate max-w-[120px]"
                >
                  {post.display_name}
                </Link>
                
                <Link
                  href={`/profile/${post.username}`}
                  className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[100px]"
                >
                  @{post.username}
                </Link>
                
                <span className="text-gray-500 dark:text-gray-400 mx-1">·</span>
                
                <span 
                  className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap"
                  title={format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}
                >
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {/* Post visibility badge */}
              {post.is_public === false && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Private
                </Badge>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            <p className="whitespace-pre-wrap text-pretty break-words text-gray-900 dark:text-gray-100 text-base leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Post Image - PRIKAZUJE SLIKU AKO POSTOJI */}
          {renderPostImage()}

          {/* Post Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mt-6 mb-4">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{likesCount}</span>
              <span>Likes</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{post.comments_count}</span>
              <span>Comments</span>
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex items-center justify-between border-t border-b py-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-5 w-5" />
              {post.comments_count > 0 && (
                <span className="ml-1 text-xs">{post.comments_count}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 ${
                liked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"
              }`}
              onClick={handleLike}
              disabled={loading}
            >
              <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
              {likesCount > 0 && (
                <span className="ml-1 text-xs">{likesCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary"
              onClick={handleShare}
            >
              <Share className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary"
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </div>

          {/* Detailed Timestamp */}
          <div className="mt-4 pt-4 border-t border-dashed">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Posted at {format(new Date(post.created_at), "h:mm a")} ·{" "}
              {format(new Date(post.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </article>

        {/* Comments Section - Simplified for Mobile */}
        <div className="px-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Comments</h3>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment</p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full rounded-full border bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="ml-2 h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Post
          </Button>
        </div>
      </div>
      <div className="pb-14" />

      {/* Image Preview Modal */}
      {showImagePreview && post.image_url && (
        <ImagePreview
          imageUrl={normalizeImageUrl(post.image_url)!}
          alt={`Post by ${post.display_name}`}
          onClose={() => setShowImagePreview(false)}
        />
      )}
    </>
  )
}