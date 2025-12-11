"use client"

import { useState } from "react"
import { UserPosts } from "@/components/profile/user-posts"

interface ProfileTabsProps {
  userId: string
  username: string
}

export function ProfileTabs({ userId, username }: ProfileTabsProps) {
  const [activeTab] = useState<"posts">("posts")

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b">
        <div className="flex">
          <button
            className={`flex-1 py-4 text-sm font-medium ${
              activeTab === "posts" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
            }`}
          >
            Posts
          </button>
        </div>
      </div>

      <div className="py-4">{activeTab === "posts" && <UserPosts userId={userId} />}</div>
    </div>
  )
}
