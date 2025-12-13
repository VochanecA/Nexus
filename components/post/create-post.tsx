"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { ImageIcon, X } from "lucide-react"
import Image from "next/image"

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
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Provjera veličine (npr. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Slika je prevelika. Maksimalna veličina je 5MB.")
      return
    }

    // Provjera tipa
    if (!file.type.startsWith("image/")) {
      setError("Molimo odaberite validnu sliku.")
      return
    }

    setImage(file)
    setError(null)

    // Kreiranje preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !image) return

    setError(null)
    setLoading(true)

    const supabase = createClient()
    let imageUrl: string | null = null

    try {
      // Ako postoji slika, uploadujte je
      if (image) {
        const fileExt = image.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, image)

        if (uploadError) {
          throw new Error(`Greška pri uploadu slike: ${uploadError.message}`)
        }

        // Dobijte public URL
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(filePath)

        imageUrl = urlData.publicUrl
      }

      // Kreirajte post sa ili bez slike
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
      })

      if (postError) {
        throw new Error(postError.message)
      }

      // Reset forme
      setContent("")
      setImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Refresh podataka
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Došlo je do greške")
    } finally {
      setLoading(false)
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

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mt-2">
                <div className="relative h-64 w-full overflow-hidden rounded-lg">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={removeImage}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Skriveni file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  disabled={loading}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm">{content.length}/280</span>
                <Button type="submit" disabled={loading || (!content.trim() && !image)} size="sm">
                  {loading ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}