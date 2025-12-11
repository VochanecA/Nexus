import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-base",
    md: "h-8 w-8 text-xl",
    lg: "h-12 w-12 text-3xl",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground",
        sizeClasses[size],
        className,
      )}
    >
      N
    </div>
  )
}
