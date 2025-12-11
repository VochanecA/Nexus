// components/layout/mobile-navigation.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Search, 
  PlusCircle, 
  Bell, 
  User, 
  Menu,
  X,
  LogOut,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

interface MobileNavigationProps {
  username?: string;
  isAuthenticated?: boolean;
}

export function MobileNavigation({ 
  username, 
  isAuthenticated = false 
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/home", icon: Home, label: "Home", active: pathname === "/home" },
    { href: "/explore", icon: Search, label: "Explore", active: pathname === "/explore" },
    { href: "/create", icon: PlusCircle, label: "Create", active: pathname === "/create" },
    { href: "/notifications", icon: Bell, label: "Notifications", active: pathname === "/notifications" },
    { href: `/profile/${username}`, icon: User, label: "Profile", active: pathname.startsWith("/profile") },
  ];

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    if (href.startsWith("/profile")) return pathname.startsWith("/profile");
    return pathname === href;
  };

  // Bottom navigation bar (samo ikone)
  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-16 items-center justify-around">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 ${
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          
          {/* Menu button za dodatne opcije */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center p-2 text-muted-foreground hover:text-foreground">
                <Menu className="h-6 w-6" />
                <span className="text-xs mt-1">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <span>Login</span>
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <span>Register</span>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Top App Bar za mobile */}
      <div className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
        <div className="flex items-center justify-between w-full">
          <Link href="/home" className="font-bold text-xl">
            Nexus
          </Link>
          
          {isAuthenticated && username ? (
            <Link href={`/profile/${username}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}