// components/layout/theme-switcher-section.tsx
"use client"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { Separator } from "@/components/ui/separator"

export function ThemeSwitcherSection() {
  return (
    <div className="space-y-4 p-4 border-t">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Theme</span>
        <span className="text-xs text-muted-foreground">Switch appearance</span>
      </div>
      <ThemeSwitcher variant="button" size="sm" />
      <Separator />
      <div className="text-xs text-muted-foreground">
        Theme affects all pages. Changes are saved to your browser.
      </div>
    </div>
  )
}