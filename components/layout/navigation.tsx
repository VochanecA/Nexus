"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, User, LogOut, LogIn, UserPlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavigationProps {
  username?: string;
  isAuthenticated?: boolean;
}

export function Navigation({ username, isAuthenticated = false }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    posts: any[];
  }>({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
      
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  // Debounced search function
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ users: [], posts: [] });
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const supabase = createClient();
        
        // Pretraži korisnike
        const { data: users } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .limit(5);

        // Pretraži postove
        const { data: posts } = await supabase
          .from("posts")
          .select("id, content, created_at, user_id, profiles(username, avatar_url)")
          .or(`content.ilike.%${searchQuery}%`)
          .limit(5);

        setSearchResults({
          users: users || [],
          posts: posts || []
        });
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // Debounce 300ms
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigate to result
  const handleResultClick = (type: "user" | "post", id: string, username?: string) => {
    setSearchQuery("");
    setShowResults(false);
    if (type === "user" && username) {
      router.push(`/profile/${username}`);
    } else if (type === "post") {
      router.push(`/post/${id}`);
    }
  };

  // Handle Enter key for search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowResults(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setShowResults(false);
  };

  const navItems = [
    {
      href: "/home",
      label: "Home",
      icon: Home,
    },
    ...(isAuthenticated && username
      ? [
          {
            href: `/profile/${username}`,
            label: "Profile",
            icon: User,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r bg-card p-4">
      {/* Logo */}
      <div className="mb-6">
        <Link href="/home" className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-xl font-bold">Nexus</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users and posts..."
            className="pl-9 pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery && setShowResults(true)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && !searchQuery && (
            <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (searchResults.users.length > 0 || searchResults.posts.length > 0) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-md border bg-popover shadow-lg">
            <ScrollArea className="h-full">
              {/* Users Results */}
              {searchResults.users.length > 0 && (
                <div className="p-2">
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                    Users
                  </h3>
                  <div className="space-y-1">
                    {searchResults.users.map((user) => (
                      <button
                        key={user.id}
                        className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
                        onClick={() => handleResultClick("user", user.id, user.username)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden">
                          <p className="font-medium truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Results */}
              {searchResults.posts.length > 0 && (
                <div className={cn("p-2", searchResults.users.length > 0 && "border-t")}>
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                    Posts
                  </h3>
                  <div className="space-y-1">
                    {searchResults.posts.map((post) => (
                      <button
                        key={post.id}
                        className="flex w-full flex-col gap-1 rounded-md p-2 hover:bg-accent transition-colors text-left"
                        onClick={() => handleResultClick("post", post.id)}
                      >
                        <p className="line-clamp-2 text-sm">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback className="text-[10px]">
                              {post.profiles?.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            @{post.profiles?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* No Results */}
        {showResults && searchResults.users.length === 0 && searchResults.posts.length === 0 && !isSearching && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-4 shadow-lg">
            <p className="text-center text-sm text-muted-foreground">
              No results found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || 
            (item.href === "/home" && pathname === "/home") ||
            (item.href.includes("/profile") && pathname?.includes("/profile"));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 text-base"
                size="lg"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Auth Section */}
      <div className="space-y-2">
        {isAuthenticated ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-base text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
            size="lg"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        ) : (
          <>
            <Link href="/login" className="block">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-base"
                size="lg"
              >
                <LogIn className="h-5 w-5" />
                Sign In
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button
                variant="default"
                className="w-full justify-start gap-3 text-base"
                size="lg"
              >
                <UserPlus className="h-5 w-5" />
                Create Account
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}