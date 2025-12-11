import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PostDetail } from "@/components/post/post-detail"
import { CommentsList } from "@/components/post/comments-list"
import { CreateComment } from "@/components/post/create-comment"

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

  // Get the post with profile info
  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(username, display_name, avatar_url)
    `,
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

  const postData = {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    user_id: post.user_id,
    username: post.profiles.username,
    display_name: post.profiles.display_name,
    avatar_url: post.profiles.avatar_url,
    likes_count: likesCount ?? 0,
    comments_count: commentsCount ?? 0,
    user_has_liked: !!like,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl">
        <PostDetail post={postData} />
        <CreateComment postId={id} />
        <CommentsList postId={id} />
      </div>
    </div>
  )
}
