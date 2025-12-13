"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface CommentsListProps {
  postId: string
}

export function CommentsList({ postId }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComments() {
      const supabase = createClient()

      const { data } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles!comments_user_id_fkey(username, display_name, avatar_url)
        `,
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (data) {
        const formattedComments = data.map((comment) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          username: comment.profiles.username,
          display_name: comment.profiles.display_name,
          avatar_url: comment.profiles.avatar_url,
        }))

        setComments(formattedComments)
      }

      setLoading(false)
    }

    fetchComments()
  }, [postId])

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading comments...</div>
  }

  if (comments.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No comments yet</div>
  }

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <article key={comment.id} className="bg-card p-4">
          <div className="flex gap-3">
            <Link href={`/profile/${comment.username}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={comment.avatar_url || undefined} alt={comment.display_name} />
                <AvatarFallback>{comment.display_name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${comment.username}`} className="font-semibold hover:underline">
                  {comment.display_name}
                </Link>
                <Link href={`/profile/${comment.username}`} className="text-muted-foreground text-sm hover:underline">
                  @{comment.username}
                </Link>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-pretty">{comment.content}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
