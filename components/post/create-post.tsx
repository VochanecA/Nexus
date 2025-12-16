// components/post/create-post.tsx - MOBILE OPTIMIZED
"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { ImageIcon, X, Camera, Video, Smile, Globe, Gift, Send, Plus, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CreatePostProps {
  user: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
  onPostCreated?: () => void
  compact?: boolean
  autoFocus?: boolean
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

export function CreatePost({ user, onPostCreated, compact = false, autoFocus = false }: CreatePostProps) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [characterCount, setCharacterCount] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto focus na textarea
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [autoFocus])

  // Handle virtual keyboard on mobile
  useEffect(() => {
    const handleResize = () => {
      if (isFocused && window.innerHeight < 500) {
        // Mobile keyboard is open, scroll into view
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isFocused])

  // Optimizovana funkcija za obradu slike
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Brza validacija
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Slika je prevelika. Maksimalna veličina je 10MB.")
      return
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Podržani formati: JPG, PNG, WEBP, GIF")
      return
    }

    // Optimizovano čitanje fajla
    const reader = new FileReader()
    reader.onloadstart = () => {
      setLoading(true)
    }
    
    reader.onloadend = () => {
      setImage(file)
      setImagePreview(reader.result as string)
      setLoading(false)
      setError(null)
      
      // Automatski fokusiraj textarea nakon odabira slike
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
    
    reader.onerror = () => {
      setError("Greška pri čitanju slike")
      setLoading(false)
    }

    reader.readAsDataURL(file)
  }, [])

  const removeImage = useCallback(() => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    toast.success("Slika uklonjena")
  }, [])

  // Optimizovano slanje posta
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && !image) {
      toast.error("Unesite tekst ili dodajte sliku")
      return
    }

    if (content.length > 280) {
      toast.error("Post je predug. Maksimalno 280 karaktera.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()
    let imageUrl: string | null = null

    try {
      // Upload slike ako postoji - optimizovano sa timeout
      if (image) {
        const uploadPromise = new Promise<string>(async (resolve, reject) => {
          try {
            const fileExt = image.name.split(".").pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            const { error: uploadError, data } = await supabase.storage
              .from("post-images")
              .upload(filePath, image, {
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) reject(uploadError)

            // Dobij public URL
            const { data: urlData } = supabase.storage
              .from("post-images")
              .getPublicUrl(filePath)

            resolve(urlData.publicUrl)
          } catch (err) {
            reject(err)
          }
        })

        // Timeout za upload
        imageUrl = await Promise.race([
          uploadPromise,
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Upload timeout")), 10000)
          )
        ])
      }

      // Kreiraj post
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        is_public: isPublic,
        impressions: 0,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false
      })

      if (postError) throw postError

      // Reset forme
      setContent("")
      setImage(null)
      setImagePreview(null)
      setCharacterCount(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
      
      // Notifikacija
      toast.success("Post objavljen!", {
        position: "top-center",
        duration: 2000,
      })

      // Pozovi callback ako postoji
      onPostCreated?.()

      // Refresh
      router.refresh()

    } catch (err: any) {
      console.error("Error creating post:", err)
      const errorMessage = err.message || "Došlo je do greške pri objavljivanju"
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-center",
      })
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }, [content, image, isPublic, user.id, router, onPostCreated])

  // Mobile optimizovane funkcije
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    setCharacterCount(value.length)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter za submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      handleSubmit(e as any)
    }
    
    // Esc za izlaz iz fokusa na mobilnom
    if (e.key === 'Escape' && window.innerWidth < 768) {
      textareaRef.current?.blur()
    }
  }, [handleSubmit, isSubmitting])

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Render optimizacija - memoizovane komponente
  const ImagePreviewComponent = useCallback(() => {
    if (!imagePreview) return null

    return (
      <div className="relative mt-3 animate-in fade-in duration-200">
        <div className="relative aspect-square md:aspect-video w-full overflow-hidden rounded-xl border bg-muted">
          <Image
            src={imagePreview}
            alt="Preview"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
          />
          {/* Blur overlay za better UX */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -right-2 -top-2 h-8 w-8 rounded-full shadow-lg"
          onClick={removeImage}
          disabled={isSubmitting}
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }, [imagePreview, isSubmitting, removeImage])

  const ActionButtons = useCallback(() => (
    <div className="flex items-center gap-2">
      {/* Mobile-first action buttons */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={triggerFileInput}
              disabled={isSubmitting || loading}
              className={cn(
                "h-10 w-10 rounded-full",
                "hover:bg-blue-50 hover:text-blue-600",
                "dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
                "transition-colors"
              )}
              aria-label="Add image"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Dodaj sliku</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mobile-only quick actions */}
      <div className="md:hidden flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => toast.info("Emoji podrška uskoro dolazi!")}
          aria-label="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label="More options"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info("GIF podrška uskoro dolazi!")}>
              <Gift className="h-4 w-4 mr-2" />
              GIF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Video podrška uskoro dolazi!")}>
              <Video className="h-4 w-4 mr-2" />
              Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ), [triggerFileInput, isSubmitting, loading])

  return (
    <div 
      ref={containerRef}
      className={cn(
        "bg-card transition-all duration-300",
        !compact && "border-b",
        isFocused && "bg-background shadow-sm"
      )}
    >
      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className={cn(
          "p-3 md:p-4",
          compact && "p-2"
        )}
      >
        <div className="flex gap-3 md:gap-4">
          {/* Avatar - hidden on very small screens */}
          <Avatar className={cn(
            "h-9 w-9 md:h-10 md:w-10 flex-shrink-0",
            "border-2 border-background",
            compact && "h-8 w-8"
          )}>
            <AvatarImage 
              src={user.avatar_url || undefined} 
              alt={user.display_name}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
              {user.display_name[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Compact mode - samo textarea i submit */}
            {compact ? (
              <div className="flex items-center gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Šta se dešava?"
                  value={content}
                  onChange={handleTextareaChange}
                  disabled={isSubmitting}
                  className={cn(
                    "min-h-[40px] max-h-[120px] resize-none border-0 p-0 text-sm",
                    "focus-visible:ring-0 focus-visible:outline-none",
                    "placeholder:text-muted-foreground/60"
                  )}
                  maxLength={280}
                  rows={1}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSubmitting || (!content.trim() && !image)}
                  className={cn(
                    "h-8 w-8 rounded-full flex-shrink-0",
                    "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  )}
                  aria-label="Post"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <>
                {/* Normal mode */}
                <div className="space-y-3">
                  {/* Privacy toggle - hidden on mobile */}
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full gap-2"
                      onClick={() => setIsPublic(!isPublic)}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{isPublic ? 'Javno' : 'Privatno'}</span>
                    </Button>
                  </div>

                  <Textarea
                    ref={textareaRef}
                    placeholder="Šta se dešava?"
                    value={content}
                    onChange={handleTextareaChange}
                    disabled={isSubmitting}
                    className={cn(
                      "min-h-[100px] md:min-h-[120px] resize-none border-0 p-0",
                      "focus-visible:ring-0 focus-visible:outline-none",
                      "text-base md:text-lg placeholder:text-muted-foreground/60",
                      "max-h-[200px] md:max-h-[300px]"
                    )}
                    maxLength={280}
                    rows={3}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                  />

                  {/* Image Preview */}
                  <ImagePreviewComponent />

                  {error && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top duration-200">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        disabled={isSubmitting}
                        capture="environment" // Mobile camera optimization
                      />
                      
                      <ActionButtons />
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3">
                      {/* Character counter */}
                      <div className={cn(
                        "text-xs transition-colors",
                        characterCount > 260 ? "text-red-500 font-medium" : "text-muted-foreground"
                      )}>
                        <span className={cn(
                          characterCount > 260 && "animate-pulse"
                        )}>
                          {characterCount}/280
                        </span>
                      </div>

                      {/* Submit button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || (!content.trim() && !image)}
                        className={cn(
                          "rounded-full px-5",
                          "bg-gradient-to-r from-blue-500 to-purple-500",
                          "hover:from-blue-600 hover:to-purple-600",
                          "text-white font-medium",
                          "transition-all duration-200",
                          "shadow-lg shadow-blue-500/20",
                          "hover:shadow-xl hover:shadow-blue-500/30",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        size={window.innerWidth < 768 ? "sm" : "default"}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Objavljivanje...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Objavi
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile hints */}
                  <div className="md:hidden text-xs text-muted-foreground/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>• Dodaj sliku sa kamerom</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">Ctrl+Enter za brzo slanje</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}