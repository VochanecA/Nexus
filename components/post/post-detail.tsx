"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface Post {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  const router = useRouter()
  const [liked, setLiked] = useState(post.user_has_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [loading, setLoading] = useState(false)

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

    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      setLiked(false)
      setLikesCount((prev) => prev - 1)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id })
      setLiked(true)
      setLikesCount((prev) => prev + 1)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="border-b bg-card">
      <div className="flex items-center gap-4 border-b p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Post</h1>
      </div>

      <article className="p-4">
        <div className="flex gap-3">
          <Link href={`/profile/${post.username}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.avatar_url || undefined} alt={post.display_name} />
              <AvatarFallback>{post.display_name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 space-y-3">
            <div>
              <Link href={`/profile/${post.username}`} className="font-semibold hover:underline">
                {post.display_name}
              </Link>
              <Link href={`/profile/${post.username}`} className="text-muted-foreground ml-2 text-sm hover:underline">
                @{post.username}
              </Link>
            </div>

            <p className="whitespace-pre-wrap text-pretty text-lg">{post.content}</p>

            <p className="text-muted-foreground text-sm">{format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}</p>

            <div className="flex items-center gap-6 border-y py-3">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{likesCount}</span>
                <span className="text-muted-foreground text-sm">Likes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{post.comments_count}</span>
                <span className="text-muted-foreground text-sm">Comments</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-primary">
                <MessageCircle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-9 gap-2 ${
                  liked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"
                }`}
                onClick={handleLike}
                disabled={loading}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
