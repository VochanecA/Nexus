// components/profile/profile-tabs.tsx
"use client"

import { useState } from "react"
import { UserPosts } from "@/components/profile/user-posts"
import { AdPreferencesSection } from "@/components/profile/ad-preferences-section"
import { BlockedUsersSection } from "@/components/profile/blocked-users-section"
import { Bell, Shield, MessageSquare } from "lucide-react"

interface ProfileTabsProps {
  userId: string
  username: string
  isOwnProfile?: boolean
}

type TabType = "posts" | "ad-preferences" | "blocked-users"

export function ProfileTabs({ userId, username, isOwnProfile = false }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("posts")

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "posts" 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Posts
          </button>
          
          {/* Show Ad Preferences tab only on own profile */}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("ad-preferences")}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "ad-preferences" 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="h-4 w-4" />
              Ad Preferences
            </button>
          )}
          
          {/* Show Blocked Users tab only on own profile */}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("blocked-users")}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "blocked-users" 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              Blocked Users
            </button>
          )}
        </div>
      </div>

      <div className="py-4">
        {activeTab === "posts" && <UserPosts userId={userId} />}
        {activeTab === "ad-preferences" && isOwnProfile && (
          <div className="max-w-3xl mx-auto">
            <AdPreferencesSection />
          </div>
        )}
        {activeTab === "blocked-users" && isOwnProfile && (
          <div className="max-w-3xl mx-auto">
            <BlockedUsersSection />
          </div>
        )}
      </div>
    </div>
  )
}