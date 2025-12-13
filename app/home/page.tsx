// app/home/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Alert, 
  AlertDescription 
} from "@/components/ui/alert";
import { 
  AlertCircle, 
  Users, 
  Plus, 
  Pencil, 
  Sparkles, 
  Settings, 
  Info, 
  Brain, 
  Clock, 
  Zap, 
  Heart, 
  Shield,
  Menu,
  Home,
  Hash,
  Search,
  ArrowRight,
  TrendingUp,
  Flame,
  UserCheck,
  UserPlus,
  ImageIcon,
  X,
  Upload,
  Crop,
  Check,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ProvenanceService } from '@/lib/provenance/provenance';

// Import feed engine components
import { Feed } from "@/components/feed/feed";
import { AlgorithmFeed } from "@/components/feed/AlgorithmFeed";
import { AlgorithmSelector } from "@/components/feed/AlgorithmSelector";

// Import feed engine
import { FeedEngine } from "@/lib/feed-engine/engine";

// Import cache functions
import { invalidateCache } from '@/lib/cache';

// Import ThemeSwitcher - DODAJTE OVAJ IMPORT
import { ThemeSwitcher } from "@/components/theme-switcher";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string;
  created_at: string;
}

interface FeedAlgorithm {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_official: boolean;
  is_public: boolean;
  version: string;
  algorithm_config: Record<string, unknown>;
  signal_descriptions: Record<string, unknown>;
  weight_config: Record<string, unknown>;
  install_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  followingCount: number;
  followerCount: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ValidationError {
  field: 'image' | 'content' | 'general';
  message: string;
}

const feedEngine = new FeedEngine();

// Helper functions (ostaju iste)
const detectAIContent = (content: string): boolean => {
  const aiIndicators = [
    /as an ai language model/gi,
    /i am an ai/gi,
    /i cannot.*because/gi,
    /based on.*training data/gi,
    /my knowledge cutoff/gi,
    /i don[']?t have real-time/gi,
    /as a language model/gi
  ];
  
  let score = 0;
  aiIndicators.forEach(pattern => {
    if (pattern.test(content)) score++;
  });
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = content.length / Math.max(sentences.length, 1);
  
  if (sentences.length > 5 && avgSentenceLength > 50) {
    score += 0.5;
  }
  
  const aiPhrases = [
    'in summary',
    'to conclude',
    'furthermore',
    'additionally',
    'it is important to note',
    'this highlights',
    'it demonstrates'
  ];
  
  aiPhrases.forEach(phrase => {
    if (content.toLowerCase().includes(phrase)) {
      score += 0.2;
    }
  });
  
  return score >= 1.5;
};

const validateImageFile = async (file: File): Promise<ValidationError | null> => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      field: 'image',
      message: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP image.'
    };
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      field: 'image',
      message: 'Image is too large. Maximum size is 10MB.'
    };
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const maxWidth = 4000;
      const maxHeight = 4000;
      
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          field: 'image',
          message: `Image dimensions are too large. Maximum allowed is ${maxWidth}x${maxHeight}px.`
        });
      } else {
        resolve(null);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        field: 'image',
        message: 'Unable to load image. Please try a different file.'
      });
    };
    
    img.src = objectUrl;
  });
};

export default function HomePage(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ followingCount: 0, followerCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [showFollowButtons, setShowFollowButtons] = useState(true);
  const [feedTab, setFeedTab] = useState<'algorithm' | 'following' | 'chronological'>('algorithm');
  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image cropping states
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  // Algorithm states
  const [activeAlgorithm, setActiveAlgorithm] = useState<FeedAlgorithm | null>(null);
  const [algorithmLoading, setAlgorithmLoading] = useState(false);
  const [showAlgorithmSelector, setShowAlgorithmSelector] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  const supabase = createClient();

  // Helper functions ostaju iste
  const fetchUserData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();
        
        if (userProfile) {
          setProfile({
            id: userProfile.id,
            display_name: userProfile.display_name,
            avatar_url: userProfile.avatar_url,
            bio: userProfile.bio,
            username: userProfile.username || 'user',
            created_at: userProfile.created_at,
          });
        }

        const [followingsResponse, followersResponse] = await Promise.all([
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUser.id),
          supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", currentUser.id)
        ]);

        const followingIds = followingsResponse.data?.map(follow => follow.following_id) || [];
        const followerCount = followersResponse.data?.length || 0;

        setFollowingUserIds([...followingIds, currentUser.id]);
        setUserStats({
          followingCount: Math.max(0, followingIds.length),
          followerCount
        });

        await loadActiveAlgorithm(currentUser.id);

        const { error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        
        if (profileError?.message?.includes("Could not find the table")) {
          setDatabaseError("database_not_setup");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchUserData();
  }, [fetchUserData]);

  const loadActiveAlgorithm = async (userId: string): Promise<void> => {
    setAlgorithmLoading(true);
    try {
      const algorithm = await feedEngine.getUserAlgorithm(userId);
      setActiveAlgorithm(algorithm);
    } catch (error) {
      console.error("Error loading algorithm:", error);
    } finally {
      setAlgorithmLoading(false);
    }
  };

  const handleFollowChange = useCallback((userId: string, isFollowing: boolean): void => {
    if (isFollowing) {
      setFollowingUserIds(prev => [...prev, userId]);
    } else {
      setFollowingUserIds(prev => prev.filter(id => id !== userId));
    }
    
    void fetchUserData();
  }, [fetchUserData]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const content = e.target.value;
    setPostContent(content);
    setCharacterCount(content.length);
    
    setValidationErrors(prev => prev.filter(error => error.field !== 'content'));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationErrors(prev => prev.filter(error => error.field !== 'image'));

    const validationError = await validateImageFile(file);
    if (validationError) {
      setValidationErrors(prev => [...prev, validationError]);
      return;
    }

    setSelectedImage(file);
    setIsUploading(false);
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setCropMode(true);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (): void => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadProgress(0);
    setIsUploading(false);
    setCropMode(false);
    setValidationErrors(prev => prev.filter(error => error.field !== 'image'));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!postContent.trim() && !selectedImage) {
      errors.push({
        field: 'content',
        message: 'Please add some text or an image to your post.'
      });
    }

    if (postContent.length > 280) {
      errors.push({
        field: 'content',
        message: 'Post content is too long. Maximum 280 characters.'
      });
    }

    return errors;
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !profile?.id) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let imageToUpload = selectedImage;
      
      if (cropMode && croppedAreaPixels && imagePreview) {
        console.log('Cropping would happen here with area:', croppedAreaPixels);
      }

      const fileExt = imageToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, imageToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      setValidationErrors(prev => [...prev, {
        field: 'image',
        message: error instanceof Error ? error.message : 'Failed to upload image'
      }]);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePost = async (): Promise<void> => {
    const formErrors = validateForm();
    if (formErrors.length > 0) {
      setValidationErrors(formErrors);
      return;
    }

    if (!user || (!postContent.trim() && !selectedImage)) return;

    setPosting(true);
    setPostError(null);
    setValidationErrors([]);

    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        try {
          imageUrl = await uploadImage();
          if (!imageUrl) {
            throw new Error("Failed to upload image. Please try again.");
          }
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
        }
      }

      const isAIGenerated = detectAIContent(postContent.trim());
      
      const postData: any = {
        user_id: user.id,
        content: postContent.trim(),
        image_url: imageUrl
      };

      try {
        const provenance = await ProvenanceService.signPost(
          '',
          user.id,
          postContent.trim(),
          {
            isAIgenerated: isAIGenerated,
          }
        );
        
        postData.content_hash = provenance.contentHash;
        postData.signature = provenance.signature;
        postData.provenance = provenance;
      } catch (provenanceError) {
        console.warn("Provenance error, continuing without it:", provenanceError);
      }

      const { error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setPostContent("");
      setCharacterCount(0);
      removeImage();
      setCreatePostDialogOpen(false);
      
      await fetchUserData();
      
      try {
        await Promise.all([
          invalidateCache('algorithm'),
          invalidateCache('following'),
          invalidateCache('chronological')
        ]);
      } catch (cacheError) {
        console.warn("Cache invalidation warning:", cacheError);
      }
      
      try {
        window.dispatchEvent(new CustomEvent('feedRefresh'));
      } catch (eventError) {
        console.error("Error dispatching refresh event:", eventError);
      }
      
    } catch (error) {
      console.error("Error creating post:", error);
      setPostError(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const algorithmIcon = (slug?: string): React.ReactNode => {
    switch (slug) {
      case 'chronological':
        return <Clock className="h-4 w-4" />;
      case 'friends-first':
        return <Users className="h-4 w-4" />;
      case 'quality-filter':
        return <Shield className="h-4 w-4" />;
      case 'mindful-feed':
        return <Heart className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const algorithmDisplayName = useMemo(() => activeAlgorithm?.name || 'Default', [activeAlgorithm]);

  const renderImagePreview = (): React.JSX.Element => {
    if (!imagePreview) return <></>;

    if (cropMode) {
      return (
        <div className="space-y-4">
          <div className="relative h-64 w-full overflow-hidden rounded-lg border">
            <div className="relative h-full w-full">
              <Image
                src={imagePreview}
                alt="Crop preview"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
                onError={(e) => {
                  console.error('Failed to load crop preview image');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="zoom" className="text-sm">
                Zoom: {zoom.toFixed(1)}x
              </Label>
              <Slider
                id="zoom"
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                disabled={isUploading}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCropMode(false)}
                disabled={isUploading}
                className="flex-1"
              >
                Cancel Crop
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCropMode(false)}
                disabled={isUploading}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative mt-2">
        <div className="relative h-64 w-full overflow-hidden rounded-lg border">
          <div className="relative h-full w-full">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
              onError={(e) => {
                console.error('Failed to load preview image');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={removeImage}
          disabled={isUploading || posting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderLoadingState = (): React.JSX.Element => (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </header>
      
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6">
          <div className="hidden w-64 shrink-0 space-y-6 lg:block">
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="hidden w-80 shrink-0 space-y-6 xl:block">
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatabaseErrorState = (): React.JSX.Element => (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nexus</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-3 text-2xl font-bold">Setup Required</h2>
          <p className="mb-6 text-muted-foreground">
            Database tables need to be created. Run the SQL scripts in your Supabase project.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View Docs</Button>
            </Link>
            <Button onClick={() => window.location.reload()} variant="secondary">
              <Sparkles className="mr-2 h-4 w-4" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  if (databaseError === "database_not_setup") {
    return renderDatabaseErrorState();
  }

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Nexus</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 space-y-2">
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Home className="h-5 w-5" />
                      Home
                    </Button>
                  </Link>
                  <Link href="/explore">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Hash className="h-5 w-5" />
                      Explore
                    </Button>
                  </Link>
                  <Link href="/algorithms">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Brain className="h-5 w-5" />
                      Algorithms
                    </Button>
                  </Link>
                  <Link href="/trending">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Flame className="h-5 w-5" />
                      Trending
                    </Button>
                  </Link>
                  {/* Theme Switcher in Mobile Menu - DODANO */}
                  <div className="pt-4 border-t">
                    <div className="mb-4">
                      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Settings className="h-3 w-3" />
                        Theme
                      </div>
                      <ThemeSwitcher variant="button" size="sm" className="w-full" />
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-xl font-bold tracking-tight sm:inline">
                nexus
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Desktop navigation">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link href="/explore" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Hash className="h-4 w-4" />
              Explore
            </Link>
            <Link href="/algorithms" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Brain className="h-4 w-4" />
              Algorithms
            </Link>
            <Link href="/trending" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Flame className="h-4 w-4" />
              Trending
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search - desktop only */}
            {/* <div className="hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Nexus"
                  className="w-48 pl-9"
                />
              </div>
            </div> */}

            {/* Theme Switcher - Desktop - DODANO */}
            <ThemeSwitcher variant="icon" size="sm" />

            <div className="flex items-center gap-2">
              {/* Algorithm Status Badge */}
              {isAuthenticated && activeAlgorithm && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border">
                  <div className="flex items-center gap-2">
                    {algorithmIcon(activeAlgorithm.slug)}
                    <span className="text-sm font-medium">{activeAlgorithm.name}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Settings className="h-3 w-3" />
                        <span className="sr-only">Algorithm settings</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowAlgorithmSelector(true)}>
                        <Brain className="h-4 w-4 mr-2" />
                        Change algorithm
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowExplanations(!showExplanations)}>
                        <Info className="h-4 w-4 mr-2" />
                        {showExplanations ? "Hide explanations" : "Show explanations"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 space-y-8">
              {/* User Stats & Algorithm Control */}
              <div className="rounded-xl border bg-card p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Following Count */}
                  <button
                    type="button"
                    onClick={() => setShowFollowersModal(true)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {userStats.followingCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </button>
                  
                  {/* Followers Count */}
                  <button
                    type="button"
                    onClick={() => setShowFollowersModal(true)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {userStats.followerCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                  </button>
                </div>
                
                {/* Algorithm Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Algorithm</span>
                    <span className="font-medium">
                      {algorithmDisplayName}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowAlgorithmSelector(true)}
                  >
                    <Settings className="h-4 w-4" />
                    Change Algorithm
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowExplanations(!showExplanations)}
                  >
                    <Info className="h-4 w-4" />
                    {showExplanations ? "Hide Explanations" : "Show Explanations"}
                  </Button>
                </div>
              </div>

              {/* Theme Section - DODANO */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">APPEARANCE</h3>
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <ThemeSwitcher variant="button" size="sm" className="w-full" />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">QUICK ACTIONS</h3>
                <div className="space-y-2">
                  <Link href="/algorithms">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Brain className="h-4 w-4" />
                      Browse Algorithms
                    </Button>
                  </Link>
                  <Link href="/explore">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Hash className="h-4 w-4" />
                      Explore Topics
                    </Button>
                  </Link>
                  <Link href="/trending">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Flame className="h-4 w-4" />
                      Trending Posts
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Tabs */}
            <div className="lg:hidden mb-6">
              <Tabs 
                value={feedTab} 
                onValueChange={(value) => setFeedTab(value as typeof feedTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="algorithm" className="gap-2">
                    {algorithmIcon(activeAlgorithm?.slug)}
                    <span className="hidden sm:inline">Algorithm</span>
                  </TabsTrigger>
                  <TabsTrigger value="following" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Following</span>
                  </TabsTrigger>
                  <TabsTrigger value="chronological" className="gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Latest</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Welcome Card */}
            <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!</h2>
                  <p className="mb-4 text-muted-foreground">
                    {activeAlgorithm 
                      ? `Your feed is powered by "${activeAlgorithm.name}" algorithm.`
                      : 'Personalize your feed with custom algorithms.'}
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      onClick={() => setShowAlgorithmSelector(true)}
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Change Algorithm
                    </Button>
                    <Link href="/algorithms">
                      <Button variant="outline">Browse All</Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20">
                    <Brain className="h-12 w-12 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {feedTab === 'algorithm' && 'Algorithm Feed'}
                  {feedTab === 'following' && 'Following Feed'}
                  {feedTab === 'chronological' && 'Latest Posts'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {feedTab === 'algorithm' && activeAlgorithm?.description}
                  {feedTab === 'following' && 'Posts from people you follow'}
                  {feedTab === 'chronological' && 'All posts in reverse chronological order'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {feedTab === 'algorithm' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExplanations(!showExplanations)}
                      className="gap-2"
                    >
                      <Info className="h-4 w-4" />
                      {showExplanations ? "Hide" : "Explain"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAlgorithmSelector(true)}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Change
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="follow-buttons"
                    checked={showFollowButtons}
                    onCheckedChange={setShowFollowButtons}
                  />
                  <Label htmlFor="follow-buttons" className="text-sm whitespace-nowrap">
                    Follow buttons
                  </Label>
                </div>
              </div>
            </div>

            {/* Feed Content */}
            {feedTab === 'algorithm' ? (
              <AlgorithmFeed
                userId={user?.id || ''}
                showExplanations={showExplanations}
              />
            ) : feedTab === 'following' ? (
              <Feed
                userId={user?.id}
                followingUserIds={followingUserIds}
                isAuthenticated={isAuthenticated}
                showFollowButton={showFollowButtons}
                onFollowChange={handleFollowChange}
              />
            ) : (
              <Feed
                userId={user?.id}
                followingUserIds={[]}
                isAuthenticated={isAuthenticated}
                showFollowButton={showFollowButtons}
                onFollowChange={handleFollowChange}
              />
            )}

            {/* Load More / CTA */}
            <div className="mt-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {feedTab === 'algorithm' 
                  ? 'Want more control over your feed?' 
                  : 'Ready to personalize your experience?'}
              </p>
              <Link href="/algorithms">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Brain className="mr-2 h-4 w-4" />
                  Explore Algorithms
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Sidebar - Trending & Info */}
          <aside className="hidden w-80 shrink-0 xl:block">
            <div className="sticky top-24 space-y-6">
              {/* Search - Desktop */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search posts, people, topics"
                  className="pl-9"
                />
              </div>

              {/* Algorithm Stats */}
              {activeAlgorithm && (
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold mb-4">Algorithm Stats</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Personalization</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Relevance</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: '92%' }} 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Diversity</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: '78%' }} 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setShowAlgorithmSelector(true)}
                    >
                      <Settings className="h-4 w-4" />
                      Tune Algorithm
                    </Button>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-semibold">Why Custom Algorithms?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Personalized Experience</p>
                      <p className="text-sm text-muted-foreground">
                        See content tailored to your interests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                      <Shield className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Transparent Control</p>
                      <p className="text-sm text-muted-foreground">
                        Know why you see each post
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Better Discovery</p>
                      <p className="text-sm text-muted-foreground">
                        Find content you actually care about
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white">
                <div className="mb-4">
                  <Brain className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Create Your Own</h3>
                <p className="mb-4 text-sm text-blue-100">
                  Design custom algorithms with our visual editor
                </p>
                <Link href="/algorithms/create">
                  <Button 
                    className="w-full bg-white text-blue-600 hover:bg-gray-100"
                    size="lg"
                  >
                    Start Creating
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Create Post Dialog */}
      <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Create Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={profile?.avatar_url ?? undefined} 
                  alt={profile?.display_name ?? "User"} 
                  onError={(e) => {
                    console.error('Failed to load avatar image');
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback>
                  {getInitials(profile?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="What's happening?"
                  value={postContent}
                  onChange={handleContentChange}
                  className="min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-lg"
                  maxLength={280}
                  disabled={posting || isUploading}
                />
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
              disabled={posting || isUploading}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={posting || isUploading}
                  className="gap-2"
                >
                  {selectedImage ? (
                    <>
                      <Upload className="h-4 w-4" />
                      Change Image
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4" />
                      Add Image
                    </>
                  )}
                </Button>
                
                {selectedImage && !cropMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCropMode(true)}
                    disabled={posting || isUploading}
                    className="gap-2"
                  >
                    <Crop className="h-4 w-4" />
                    Crop
                  </Button>
                )}
                
                {selectedImage && (
                  <span className="text-xs text-muted-foreground">
                    {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>
            
            {imagePreview && renderImagePreview()}
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {characterCount}/280 characters
                  {characterCount > 250 && (
                    <span className="ml-2 text-orange-500">
                      {280 - characterCount} left
                    </span>
                  )}
                </div>
                <Badge 
                  variant={characterCount > 280 ? "destructive" : "secondary"}
                  className={characterCount > 250 ? "bg-orange-500" : ""}
                >
                  {characterCount > 280 ? "Too long!" : "Good"}
                </Badge>
              </div>
              
              {(validationErrors.length > 0 || postError) && (
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <Alert key={index} variant={error.field === 'general' ? "destructive" : "default"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                  ))}
                  {postError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{postError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreatePostDialogOpen(false);
                  setPostError(null);
                  setValidationErrors([]);
                  removeImage();
                }}
                disabled={posting || isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreatePost()}
                disabled={posting || isUploading || (!postContent.trim() && !selectedImage) || characterCount > 280}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {posting || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Posting...'}
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Algorithm Selector Sheet */}
      <Sheet open={showAlgorithmSelector} onOpenChange={setShowAlgorithmSelector}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Choose Feed Algorithm
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {user && (
              <AlgorithmSelector 
                userId={user.id}
                onAlgorithmChange={(algorithm) => {
                  setActiveAlgorithm(algorithm);
                  setShowAlgorithmSelector(false);
                  window.location.reload();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user?.id}
        username={profile?.username}
        followingCount={userStats.followingCount}
        followerCount={userStats.followerCount}
        supabase={supabase}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-16 items-center justify-around">
          <button 
            type="button"
            onClick={() => setFeedTab('algorithm')}
            className="flex flex-col items-center gap-1 p-2"
            aria-label="Algorithm feed"
          >
            {algorithmIcon(activeAlgorithm?.slug)}
            <span className="text-xs">Algorithm</span>
          </button>
          <button 
            type="button"
            onClick={() => setFeedTab('following')}
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
            aria-label="Following feed"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Following</span>
          </button>
          <Dialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen}>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
                aria-label="Create post"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Post</span>
              </button>
            </DialogTrigger>
          </Dialog>
          <button 
            type="button"
            onClick={() => setShowAlgorithmSelector(true)}
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
            aria-label="Algorithms"
          >
            <Brain className="h-5 w-5" />
            <span className="text-xs">Algorithms</span>
          </button>
          <Link href="/explore" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Hash className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </Link>
        </div>
      </nav>
      <div className="pb-16 lg:pb-0" />

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">nexus</span>
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Personalized social experience
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/algorithms" className="text-sm text-muted-foreground hover:text-foreground">
                Algorithms
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Followers Modal Component ostaje isti
interface FollowerProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isFollowing: boolean;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  username?: string;
  followingCount: number;
  followerCount: number;
  supabase: ReturnType<typeof createClient>;
}

function FollowersModal({
  isOpen,
  onClose,
  userId,
  username,
  followingCount,
  followerCount,
  supabase
}: FollowersModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [following, setFollowing] = useState<FollowerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: followerIdsData, error: followersError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (followersError) throw new Error(followersError.message);

      const { data: followingIdsData, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (followingError) throw new Error(followingError.message);

      const followerIds = followerIdsData?.map(f => f.follower_id) || [];
      const followingIds = followingIdsData?.map(f => f.following_id) || [];

      let followerProfiles: FollowerProfile[] = [];
      let followingProfiles: FollowerProfile[] = [];

      if (followerIds.length > 0) {
        const { data: followersProfilesData, error: followersProfilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", followerIds);

        if (followersProfilesError) throw new Error(followersProfilesError.message);

        const { data: myFollowingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", followerIds);

        const followingIdsSet = new Set(myFollowingData?.map(f => f.following_id) || []);

        followerProfiles = (followersProfilesData || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          isFollowing: followingIdsSet.has(profile.id)
        }));
      }

      if (followingIds.length > 0) {
        const { data: followingProfilesData, error: followingProfilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", followingIds);

        if (followingProfilesError) throw new Error(followingProfilesError.message);

        followingProfiles = (followingProfilesData || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          isFollowing: true
        }));
      }

      setFollowers(followerProfiles);
      setFollowing(followingProfiles);
    } catch (err) {
      console.error("Error fetching followers:", err);
      setError(err instanceof Error ? err.message : "Failed to load followers");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      void fetchFollowers();
    }
  }, [isOpen, userId, fetchFollowers]);

  const handleFollowToggle = async (profileId: string, currentlyFollowing: boolean): Promise<void> => {
    if (!userId) return;

    try {
      if (currentlyFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", profileId);
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: userId,
            following_id: profileId
          });
      }

      await fetchFollowers();
    } catch (err) {
      console.error("Error toggling follow:", err);
      setError("Failed to update follow status");
    }
  };

  const currentData = activeTab === 'followers' ? followers : following;
  const currentCount = activeTab === 'followers' ? followerCount : followingCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {username ? `${username}'s Connections` : 'Your Connections'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === 'followers' ? 'default' : 'outline'}
              onClick={() => setActiveTab('followers')}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Followers ({followerCount})
            </Button>
            <Button
              variant={activeTab === 'following' ? 'default' : 'outline'}
              onClick={() => setActiveTab('following')}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Following ({followingCount})
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : currentData.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {activeTab === 'followers' 
                  ? 'When people follow you, they will appear here.'
                  : 'Start following people to see their posts in your feed.'}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {currentData.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <Link 
                      href={`/profile/${profile.username}`}
                      className="flex items-center gap-3 flex-1"
                      onClick={onClose}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={profile.avatar_url ?? undefined} 
                          alt={profile.display_name ?? 'User'} 
                          onError={(e) => {
                            console.error('Failed to load follower avatar');
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback>
                          {profile.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium truncate">
                            {profile.display_name || profile.username}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        {profile.bio && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </Link>

                    {userId && profile.id !== userId && (
                      <Button
                        size="sm"
                        variant={profile.isFollowing ? "outline" : "default"}
                        onClick={() => void handleFollowToggle(profile.id, profile.isFollowing)}
                        className="whitespace-nowrap"
                      >
                        {profile.isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}