"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, User, LogOut, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

interface NavigationProps {
  username?: string;
  isAuthenticated?: boolean; // DODAJTE OVAJ PROP
}

export function Navigation({ username, isAuthenticated = false }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/home"); // Ne na /login!
    router.refresh();
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
          // Logovan korisnik - Sign Out
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-base"
            size="lg"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign out
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