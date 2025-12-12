"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, User, LogOut, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react"; // Dodajte useState za loading state

interface NavigationProps {
  username?: string;
  isAuthenticated?: boolean;
}

export function Navigation({ username, isAuthenticated = false }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false); // Loading state

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true); // Pokreni loading
      const supabase = createClient();
      
      // Sign out iz Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear client-side cache i session
      localStorage.clear();
      sessionStorage.clear();
      
      // FORCE refresh i redirect na / - koristi replace umjesto push
      window.location.href = "/"; // Ovo će kompletno osvježiti stranicu
      
      // Alternativno, možete koristiti router.replace("/") ali sa refresh
      // router.replace("/");
      // setTimeout(() => {
      //   window.location.reload();
      // }, 100);
      
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false); // Zaustavi loading ako dođe do greške
    }
  };

  // Kreiraj navigation items u zavisnosti od auth statusa
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
      <div className="mb-8">
        <Link href="/home" className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-xl font-bold">Nexus</span>
        </Link>
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

      {/* Auth Section - različito za logovane i ne-logovane */}
      <div className="space-y-2">
        {isAuthenticated ? (
          // Logovan korisnik - Sign Out sa loading state
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-base text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
            size="lg"
            onClick={handleSignOut}
            disabled={isSigningOut} // Onemogući klik dok se sign out izvršava
          >
            {isSigningOut ? (
              // Loading spinner
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        ) : (
          // Ne-logovan korisnik - Login i Signup
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