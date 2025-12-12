// app/post/[id]/page.tsx - MOBILE FIRST VIEW (SERVER COMPONENT)
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PostDetail } from "@/components/post/post-detail"
import { CommentsList } from "@/components/post/comments-list"
import { CreateComment } from "@/components/post/create-comment"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button" // Import BackButton komponente
import { Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

  // Get the post with profile info - UPDATED QUERY WITH image_url
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

  // Check if user liked the post
  const { data: like } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  // Format post data with image_url
  const postData = {
    id: post.id,
    content: post.content,
    image_url: post.image_url, // DODANO: Uključujemo image_url iz baze
    created_at: post.created_at,
    user_id: post.user_id,
    username: post.profiles.username,
    display_name: post.profiles.display_name,
    avatar_url: post.profiles.avatar_url,
    likes_count: likesCount ?? 0,
    comments_count: commentsCount ?? 0,
    user_has_liked: !!like,
    is_public: post.is_public ?? true,
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header with Back Button and Home Link */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* BackButton komponenta za mobile */}
            <BackButton 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              showText={false}
            />
            <h1 className="text-lg font-semibold">Post</h1>
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/">
              <Home className="h-5 w-5" />
              <span className="sr-only">Return to home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* BackButton komponenta za desktop */}
            <BackButton 
              variant="outline" 
              size="sm"
              className="gap-2"
              showText={true}
            />

            <h1 className="text-lg font-semibold">Post Details</h1>

            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl">
        {/* Main Post Content */}
        <div className="lg:border-x lg:border-gray-200 lg:dark:border-gray-800">
          {/* Post with Image */}
          <div className="p-4 lg:p-6">
            <PostDetail post={postData} />
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 dark:border-gray-800">
            {/* Create Comment - Mobile Optimized */}
            <div className="p-4 lg:p-6 border-b">
              <h3 className="font-semibold mb-3">
                Comments ({postData.comments_count})
              </h3>
              <CreateComment postId={id} />
            </div>

            {/* Comments List */}
            <div className="p-4 lg:p-6">
              <CommentsList postId={id} />
            </div>
          </div>
        </div>

        {/* Bottom CTA for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <div className="flex h-14 items-center justify-center px-4">
            <Button variant="outline" className="w-full max-w-xs" asChild>
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Return to Home
              </Link>
            </Button>
          </div>
        </div>
        <div className="pb-14 lg:pb-0" />
      </div>
    </div>
  )
}