// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

// Konfigurišite Inter font - Uklonite nepodržane opcije
const inter = Inter({
  subsets: ["latin", "latin-ext"], // Samo podržani subsetovi
  display: "swap", // Podržano
  weight: ["400", "500", "600", "700"], // Samo potrebni weights (Inter je variable font)
  style: ["normal"], // Uklonite "italic" ako ne koristite posebno
  variable: "--font-inter", // Podržano
  // Uklonite: fallback, preload, adjustFontFallback (nisu podržani)
})

export const metadata: Metadata = {
  title: {
    default: "Nexus - Connect with the world",
    template: "%s | Nexus"
  },
  description: "A modern social network for meaningful connections and conversations",
  generator: "v0.app",
  keywords: ["social network", "connections", "community", "nexus"],
  authors: [{ name: "Nexus Team" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nexus.app",
    title: "Nexus - Connect with the world",
    description: "A modern social network for meaningful connections and conversations",
    siteName: "Nexus",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nexus Social Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus - Connect with the world",
    description: "A modern social network for meaningful connections and conversations",
    images: ["/twitter-image.png"],
    creator: "@nexus",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html 
      lang="en" 
      className={inter.variable} // Koristite samo varijablu
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Next.js automatski dodaje preconnect za Google Fonts */}
        {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}
        {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> */}
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <div className="relative min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}