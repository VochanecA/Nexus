import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // SAMO OVU SEKCIJU PROMIJENITE:
    // Uklonite redirect za /home kada korisnik nije logovan
    
    // 🔴 STARO (UKLONITE OVO):
    // if (request.nextUrl.pathname.startsWith("/home") && !user) {
    //   const url = request.nextUrl.clone()
    //   url.pathname = "/login"
    //   return NextResponse.redirect(url)
    // }

    // 🟢 OSTAVITE OVO: Redirect logovanih korisnika sa login/signup na home
    if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
      const url = request.nextUrl.clone()
      url.pathname = "/home"
      return NextResponse.redirect(url)
    }
  } catch (error) {
    // Ignorišite greške
  }

  return supabaseResponse
}