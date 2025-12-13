"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

interface CreateCommentProps {
  postId: string
}

export function CreateComment({ postId }: CreateCommentProps) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
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
        <div className="space-y-3">
          <Textarea
            placeholder="Post your reply"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            className="min-h-[80px] resize-none"
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
              {loading ? "Replying..." : "Reply"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
