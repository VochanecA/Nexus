// components/ui/back-button.tsx - NOVI CLIENT COMPONENT
"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showText?: boolean
}

export function BackButton({ 
  variant = "outline", 
  size = "sm", 
  className = "",
  showText = true 
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.back()
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4" />
      {showText && "Back"}
    </Button>
  )
}