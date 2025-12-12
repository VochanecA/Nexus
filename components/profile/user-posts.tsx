"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PostCard } from "@/components/post/post-card"

interface Post {
  id: string
  content: string
  image_url: string | null;
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

interface UserPostsProps {
  userId: string
}

export function UserPosts({ userId }: UserPostsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      const supabase = createClient()

      const { data } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey(username, display_name, avatar_url)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (data) {
        const formattedPosts = await Promise.all(
          data.map(async (post) => {
            const { count: likesCount } = await supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id)

            const { count: commentsCount } = await supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id)

            const {
              data: { user },
            } = await supabase.auth.getUser()
            let userHasLiked = false
            if (user) {
              const { data: like } = await supabase
                .from("likes")
                .select("id")
                .eq("post_id", post.id)
                .eq("user_id", user.id)
                .maybeSingle()
              userHasLiked = !!like
            }

            return {
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
              user_has_liked: userHasLiked,
            }
          }),
        )

        setPosts(formattedPosts)
      }

      setLoading(false)
    }

    fetchPosts()
  }, [userId])

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading posts...</div>
  }

  if (posts.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No posts yet</div>
  }

  return (
    <div className="space-y-0 divide-y">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
