// components/profile/blocked-users-section.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Ban, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  UserX
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BlockedUser {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  blocked_at: string
}

export function BlockedUsersSection() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  const fetchBlockedUsers = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get blocked users
      const { data: blocks, error } = await supabase
        .from("user_blocks")
        .select(`
          blocked_id,
          created_at,
          profiles:blocked_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Transform data - profiles je niz, pa uzimamo prvi element
      const transformedData = blocks?.map(block => {
        // profiles je niz, pa uzimamo prvi element
        const profile = Array.isArray(block.profiles) ? block.profiles[0] : block.profiles
        
        return {
          id: profile?.id || block.blocked_id,
          username: profile?.username || 'unknown',
          display_name: profile?.display_name || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
          blocked_at: block.created_at
        }
      }).filter(user => user.username !== 'unknown') || []

      setBlockedUsers(transformedData)
    } catch (error) {
      console.error("Error fetching blocked users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId)

      if (error) throw error

      // Remove from local state
      setBlockedUsers(prev => prev.filter(user => user.id !== userId))
    } catch (error) {
      console.error("Error unblocking user:", error)
    } finally {
      setUnblocking(null)
    }
  }

  useEffect(() => {
    fetchBlockedUsers()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const getInitials = (name: string): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ban className="h-6 w-6 text-red-500" />
            Blocked Users
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Users you've blocked won't be able to interact with your content
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {blockedUsers.length} blocked
        </Badge>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading blocked users...</p>
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No blocked users</h3>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            Users you block won't be able to see your posts or interact with you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={user.avatar_url || undefined} 
                    alt={user.display_name} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Blocked on {formatDate(user.blocked_at)}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnblock(user.id)}
                disabled={unblocking === user.id}
                className="gap-2 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400"
              >
                {unblocking === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-4 text-sm">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">About blocking</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• Blocked users won't see your posts or comments</li>
              <li>• They can't message or follow you</li>
              <li>• You can unblock users at any time</li>
              <li>• Users won't be notified when you block or unblock them</li>
              <li>• Blocked users will be removed from your followers list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}