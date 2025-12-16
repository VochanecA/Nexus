// app/post/[id]/page.tsx - MOBILE FIRST VIEW (SERVER COMPONENT) - BlueSky Style
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PostDetail } from "@/components/post/post-detail"
import { CommentsList } from "@/components/post/comments-list"
import { CreateComment } from "@/components/post/create-comment"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { srLatn } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Dinamički import ikonica da izbegnemo probleme sa server komponentama
import dynamic from 'next/dynamic'

// Dinamički import ikonica koje su klijentske komponente
const HomeIcon = dynamic(() => import('lucide-react').then(mod => mod.Home), { ssr: true })
const MoreHorizontalIcon = dynamic(() => import('lucide-react').then(mod => mod.MoreHorizontal), { ssr: true })
const MessageCircleIcon = dynamic(() => import('lucide-react').then(mod => mod.MessageCircle), { ssr: true })
const Repeat2Icon = dynamic(() => import('lucide-react').then(mod => mod.Repeat2), { ssr: true })
const HeartIcon = dynamic(() => import('lucide-react').then(mod => mod.Heart), { ssr: true })
const BookmarkIcon = dynamic(() => import('lucide-react').then(mod => mod.Bookmark), { ssr: true })
const ShareIcon = dynamic(() => import('lucide-react').then(mod => mod.Share), { ssr: true })
const BarChart3Icon = dynamic(() => import('lucide-react').then(mod => mod.BarChart3), { ssr: true })
const EllipsisIcon = dynamic(() => import('lucide-react').then(mod => mod.Ellipsis), { ssr: true })

// Ako lucide-react ima problema, možemo koristiti druge ikonice ili fallback
// Importujemo ikonice koje su sigurno dostupne
import { Globe, Lock } from "lucide-react"

interface PostPageProps {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get current user's profile
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  // Get the post with profile info
  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq("id", id)
    .maybeSingle()

  if (!post) {
    notFound()
  }

  // Get likes count
  const { count: likesCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id)

  // Get comments count
  const { count: commentsCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id)

  // Get reposts count
  const { count: repostsCount } = await supabase
    .from("reposts")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id)

  // Check if user liked the post
  const { data: like } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  // Check if user saved the post
  const { data: saved } = await supabase
    .from("saves")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  // Format post data
  const postData = {
    id: post.id,
    content: post.content,
    image_url: post.image_url,
    created_at: post.created_at,
    user_id: post.user_id,
    username: post.profiles.username,
    display_name: post.profiles.display_name,
    avatar_url: post.profiles.avatar_url,
    likes_count: likesCount ?? 0,
    comments_count: commentsCount ?? 0,
    reposts_count: repostsCount ?? 0,
    user_has_liked: !!like,
    user_has_saved: !!saved,
    is_public: post.is_public ?? true,
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const time = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }).toLowerCase()
      
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      
      return `${time} · ${dateStr}`
    } catch (error) {
      return "pre nekoliko trenutaka"
    }
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: srLatn,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - BlueSky Style */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BackButton 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              showText={false}
            />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-none">Post</h1>
              <span className="text-xs text-muted-foreground">{postData.comments_count} comments</span>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/">
              <HomeIcon className="h-5 w-5" />
              <span className="sr-only">Home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Desktop Header - BlueSky Style */}
      <header className="hidden lg:block border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-2xl px-6 py-3">
          <div className="flex items-center gap-4">
            <BackButton 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              showText={false}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold">Post</h1>
              <p className="text-sm text-muted-foreground">{postData.comments_count} comments</p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link href="/">
                <HomeIcon className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl">
        {/* Main Content */}
        <div className="lg:border-x lg:border-gray-200 lg:dark:border-gray-800">
          {/* Original Post - BlueSky Style */}
          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-800">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={postData.avatar_url || undefined} 
                    alt={postData.display_name || postData.username}
                  />
                  <AvatarFallback>
                    {(postData.display_name?.[0] || postData.username[0])?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">
                      {postData.display_name || `@${postData.username}`}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-sm">
                      @{postData.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{timeAgo}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      {postData.is_public ? (
                        <>
                          <Globe className="h-3 w-3" />
                          <span>Everybody can reply</span>
                        </>
                      ) : (
                        <>
                          {/* Fallback ako Lock ne radi */}
                          <div className="h-3 w-3 flex items-center justify-center">
                            <Lock className="h-3 w-3" />
                          </div>
                          <span>Limited replies</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-[15px] leading-normal whitespace-pre-wrap">
                {postData.content}
              </p>
              
              {/* Post Image if exists */}
              {postData.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <img
                    src={postData.image_url}
                    alt="Post image"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            {/* Post Timestamp */}
            <div className="mb-4 text-sm text-muted-foreground">
              {formatTime(postData.created_at)}
            </div>

            {/* Post Stats - BlueSky Style */}
            <div className="flex items-center gap-6 mb-4 text-sm border-t border-b border-gray-200 dark:border-gray-800 py-3">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{postData.reposts_count}</span>
                <span className="text-muted-foreground">Reposts</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{postData.comments_count}</span>
                <span className="text-muted-foreground">Comments</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{postData.likes_count}</span>
                <span className="text-muted-foreground">Likes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">0</span>
                <span className="text-muted-foreground">Quotes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">59</span>
                <span className="text-muted-foreground">Saves</span>
              </div>
            </div>

            {/* Post Actions - BlueSky Style */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MessageCircleIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Repeat2Icon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <HeartIcon className={`h-5 w-5 ${postData.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <BarChart3Icon className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <BookmarkIcon className={`h-5 w-5 ${postData.user_has_saved ? 'fill-blue-500 text-blue-500' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <ShareIcon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <EllipsisIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Reply Section - BlueSky Style */}
          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3">
              {/* Current User Avatar */}
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage 
                  src={currentUserProfile?.avatar_url || undefined} 
                  alt={currentUserProfile?.display_name || currentUserProfile?.username}
                />
                <AvatarFallback>
                  {(currentUserProfile?.display_name?.[0] || currentUserProfile?.username?.[0])?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Reply Form */}
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-sm font-medium">
                    Replying to <span className="text-blue-500">@{postData.username}</span>
                  </span>
                </div>
                <CreateComment postId={id} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Globe className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">Everybody can reply</span>
                  </div>
                  <Button size="sm" className="rounded-full px-4">Post</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List - BlueSky Style */}
          <div>
            <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">
                Comments ({postData.comments_count})
              </h3>
            </div>
            <CommentsList postId={id} />
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile - BlueSky Style */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-14 items-center justify-around px-4">
          <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
            <Link href="/">
              <HomeIcon className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 relative"
          >
            <MessageCircleIcon className="h-5 w-5" />
            {postData.comments_count > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {postData.comments_count > 99 ? '99+' : postData.comments_count}
              </span>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 relative"
          >
            <HeartIcon className={`h-5 w-5 ${postData.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
            {postData.likes_count > 0 && (
              <span className="absolute -top-1 -right-1 text-xs text-muted-foreground">
                {postData.likes_count > 99 ? '99+' : postData.likes_count}
              </span>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10"
          >
            <BookmarkIcon className={`h-5 w-5 ${postData.user_has_saved ? 'fill-blue-500 text-blue-500' : ''}`} />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ShareIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="pb-14 lg:pb-0" />
    </div>
  )
}