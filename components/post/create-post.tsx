"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

interface CreatePostProps {
  user: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export function CreatePost({ user }: CreatePostProps) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setContent("")
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="border-b bg-card p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
            <AvatarFallback>{user.display_name[0].toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0"
              maxLength={280}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{content.length}/280</span>
              <Button type="submit" disabled={loading || !content.trim()} size="sm">
                {loading ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
