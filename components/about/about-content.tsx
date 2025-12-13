// components/about/about-content.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Users, 
  Code, 
  Globe, 
  Shield, 
  Zap, 
  MessageSquare,
  TrendingUp,
  Database,
  Cloud,
  Lock,
  Heart,
  Terminal,
  Plane,
  Briefcase,
  Cpu,
  Network,
  Rocket,
  Target,
  Award,
  Coffee,
  Brain,
  Palette,
  Smartphone,
  Server,
  Workflow,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

export default function AboutContent() {
  const techStack = [
    { name: "Next.js 14", icon: "⚡", color: "from-black to-gray-800" },
    { name: "TypeScript", icon: "📘", color: "from-blue-600 to-blue-400" },
    { name: "Tailwind CSS", icon: "🎨", color: "from-cyan-500 to-blue-500" },
    { name: "Supabase", icon: "🛢️", color: "from-emerald-500 to-green-400" },
    { name: "PostgreSQL", icon: "🐘", color: "from-blue-400 to-indigo-500" },
    { name: "React", icon: "⚛️", color: "from-cyan-400 to-blue-500" },
    { name: "shadcn/ui", icon: "🎭", color: "from-purple-500 to-pink-500" },
    { name: "Vercel", icon: "▲", color: "from-black to-gray-700" },
  ];

  const features = [
    {
      title: "Real-time Engagement",
      description: "Live updates, notifications, and instant messaging for seamless communication",
      icon: <Zap className="h-6 w-6" />,
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Content Provenance",
      description: "Blockchain-inspired verification system for authentic content tracking",
      icon: <Shield className="h-6 w-6" />,
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "AI Integration",
      description: "Smart content analysis, explanation, and moderation with DeepSeek AI",
      icon: <Brain className="h-6 w-6" />,
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Multi-platform",
      description: "Responsive design that works perfectly on desktop, tablet, and mobile",
      icon: <Smartphone className="h-6 w-6" />,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Advanced Analytics",
      description: "Detailed insights into engagement, reach, and audience behavior",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "from-red-500 to-pink-500"
    },
    {
      title: "Privacy First",
      description: "End-to-end encryption and user-controlled data privacy settings",
      icon: <Lock className="h-6 w-6" />,
      color: "from-indigo-500 to-purple-600"
    },
  ];

  const projects = [
    {
      name: "Aerodromski FIDS",
      description: "Flight Information Display System za aerodrome sa real-time updates",
      tech: ["Next.js", "WebSocket", "PostgreSQL", "Redis"],
      icon: <Plane className="h-5 w-5" />
    },
    {
      name: "PA System Interface",
      description: "Modern Public Address system kontrol panel za aerodrome",
      tech: ["React", "Node.js", "Web Audio API", "Socket.io"],
      icon: <Network className="h-5 w-5" />
    },
    {
      name: "NextJS Boilerplate",
      description: "Production-ready starter template sa svim modernim feature-ima",
      tech: ["Next.js 14", "TypeScript", "Tailwind", "shadcn/ui"],
      icon: <Rocket className="h-5 w-5" />
    },
    {
      name: "Nexus Social",
      description: "Ova platforma - moderna socijalna mreža sa AI integracijom",
      tech: ["Next.js", "Supabase", "AI", "Real-time"],
      icon: <Sparkles className="h-5 w-5" />
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                About Nexus Platform
              </span>
            </div>
            
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Building the Future of{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Social Connection
              </span>
            </h1>
            
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Modern, privacy-focused social platform powered by cutting-edge technology 
              and built with passion by aviation professional turned full-stack developer.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/">
                <Button className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Explore Nexus
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="rounded-full gap-2">
                  <Users className="h-4 w-4" />
                  Join Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12">
          {/* Platform Overview */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-bold">
                Why <span className="text-blue-600 dark:text-blue-400">Nexus</span>?
              </h2>
              <p className="mx-auto max-w-3xl text-gray-600 dark:text-gray-300">
                A social platform designed for meaningful connections, built with modern 
                technology and a focus on user experience.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="group relative overflow-hidden border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                  <CardHeader>
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color}`}>
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          {/* Technology Stack */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-bold">
                Powered by <span className="text-purple-600 dark:text-purple-400">Modern Tech</span>
              </h2>
              <p className="mx-auto max-w-3xl text-gray-600 dark:text-gray-300">
                Built with the latest technologies for performance, scalability, and developer experience.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 p-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                {techStack.map((tech, index) => (
                  <div 
                    key={index}
                    className="group relative flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${tech.color} text-2xl`}>
                      {tech.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-blue-700 dark:text-blue-300">Performance</h3>
                  </div>
                  <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                    Optimized with Next.js 14 App Router, Server Components, and Edge Functions for blazing fast performance.
                  </p>
                </div>
                
                <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-bold text-purple-700 dark:text-purple-300">Security</h3>
                  </div>
                  <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                    Enterprise-grade security with Supabase Auth, Row Level Security, and end-to-end encryption.
                  </p>
                </div>
                
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-bold text-green-700 dark:text-green-300">Database</h3>
                  </div>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80">
                    PostgreSQL with real-time subscriptions, full-text search, and automatic backups.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Creator */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-bold">
                Meet <span className="text-pink-600 dark:text-pink-400">Alen</span>
              </h2>
              <p className="mx-auto max-w-3xl text-gray-600 dark:text-gray-300">
                Aviation professional by day, passionate full-stack developer by night.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column - Personal Info */}
              <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
                <CardContent className="relative p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-900 shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                        A
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-2xl font-bold">Alen</h3>
                      <p className="text-gray-600 dark:text-gray-300">Full-Stack Developer & Aviation Professional</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                          <Plane className="mr-1 h-3 w-3" />
                          Aviation
                        </Badge>
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20">
                          <Code className="mr-1 h-3 w-3" />
                          Next.js Expert
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                          <Briefcase className="mr-1 h-3 w-3" />
                          Dual Career
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      Working in the aviation industry has taught me the importance of precision, 
                      reliability, and real-time systems. These principles directly translate into 
                      my approach to software development.
                    </p>
                    
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4">
                      <h4 className="mb-2 font-semibold flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-amber-600" />
                        Dual Career Philosophy
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        My aviation background gives me unique insights into building robust, 
                        real-time systems, while my passion for modern web technologies drives 
                        innovation in every project.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Projects */}
              <div>
                <h3 className="mb-4 text-xl font-bold">Notable Projects</h3>
                <div className="space-y-4">
                  {projects.map((project, index) => (
                    <Card 
                      key={index} 
                      className="group border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                            <div className="text-blue-600 dark:text-blue-400">
                              {project.icon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold">{project.name}</h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {project.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {project.tech.map((tech, techIndex) => (
                                <Badge 
                                  key={techIndex} 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Career Journey */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 p-8">
            <h2 className="mb-6 text-center text-3xl font-bold">My Journey</h2>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
              
              <div className="space-y-12">
                {/* Aviation */}
                <div className="relative flex items-center justify-center gap-8 lg:justify-start lg:pr-8">
                  <div className="relative z-10 lg:order-2 lg:w-1/2">
                    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Plane className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-blue-700 dark:text-blue-300">Aviation Industry</h3>
                            <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Primary Career</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Flight Information Display Systems (FIDS)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Public Address (PA) Systems
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Real-time aviation data processing
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            High-reliability system design
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="hidden lg:order-1 lg:block lg:w-1/2" />
                  <div className="absolute left-1/2 z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white dark:border-gray-900 bg-blue-500 shadow-lg">
                    <Plane className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Transition */}
                <div className="relative flex items-center justify-center gap-8 lg:justify-end lg:pl-8">
                  <div className="hidden lg:order-1 lg:block lg:w-1/2" />
                  <div className="relative z-10 lg:order-2 lg:w-1/2">
                    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <Workflow className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-purple-700 dark:text-purple-300">Dual Career Path</h3>
                            <p className="text-sm text-purple-600/80 dark:text-purple-400/80">Aviation + IT</p>
                          </div>
                        </div>
                        <p className="text-sm">
                          Leveraging aviation experience in system reliability and real-time 
                          operations to build robust, scalable web applications. The precision 
                          required in aviation directly translates to writing clean, efficient code.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="absolute left-1/2 z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white dark:border-gray-900 bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                    <Workflow className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* IT Development */}
                <div className="relative flex items-center justify-center gap-8 lg:justify-start lg:pr-8">
                  <div className="relative z-10 lg:order-2 lg:w-1/2">
                    <Card className="border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
                            <Code className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-pink-700 dark:text-pink-300">Full-Stack Development</h3>
                            <p className="text-sm text-pink-600/80 dark:text-pink-400/80">Passion & Second Career</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-pink-600 dark:text-pink-400">Specialization:</h4>
                            <p className="text-sm">Next.js 14, TypeScript, Modern Web Stack</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-pink-600 dark:text-pink-400">Focus:</h4>
                            <p className="text-sm">Real-time applications, AI integration, Scalable architecture</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-pink-600 dark:text-pink-400">Philosophy:</h4>
                            <p className="text-sm">Build products that solve real problems with elegant solutions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="hidden lg:order-1 lg:block lg:w-1/2" />
                  <div className="absolute left-1/2 z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white dark:border-gray-900 bg-pink-500 shadow-lg">
                    <Code className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-8">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="mb-4 text-3xl font-bold">Join the Nexus Community</h2>
              <p className="mx-auto mb-8 max-w-2xl text-gray-600 dark:text-gray-300">
                Experience a social platform built with passion, precision, and modern technology. 
                Whether you're here to connect, share, or explore, Nexus welcomes you.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/signup">
                  <Button className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 gap-2 px-8">
                    <Sparkles className="h-4 w-4" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="rounded-full gap-2 px-8">
                    <ArrowRight className="h-4 w-4" />
                    Explore Features
                  </Button>
                </Link>
              </div>
              
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No credit card required • Privacy-focused • Built with ❤️ by Alen
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Note */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <ThemeSwitcher variant="icon" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Built with Next.js • Powered by Passion • Inspired by Aviation Excellence
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} Nexus Social Platform. Combining aviation precision with modern web development.
          </p>
        </div>
      </footer>
    </div>
  );
}