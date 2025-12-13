// app/explore/layout.tsx
import type React from "react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExploreLayout({ 
  children 
}: { 
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createClient();

  // PROVJERA: Da li je korisnik logovan
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Dohvatamo username samo ako je logovan
  let username: string | undefined;
  if (isAuthenticated && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    
    username = profile?.username;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Navigation - sakriven na mobile */}
      <div className="hidden lg:block">
        <Navigation 
          username={username} 
          isAuthenticated={isAuthenticated}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="min-h-screen">
          {children}
        </div>
        
        {/* Mobile Navigation - prikazuje se samo na dnu na mobile */}
        <div className="lg:hidden">
          <MobileNavigation 
            username={username} 
            isAuthenticated={isAuthenticated}
          />
        </div>
      </main>
    </div>
  );
}

// Importujte Navigation komponente posebno kako biste izbegli client-side import u server komponenti
import { Navigation } from "@/components/layout/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";