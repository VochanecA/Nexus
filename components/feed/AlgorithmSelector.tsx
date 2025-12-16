// components/feed/AlgorithmSelector.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FeedEngine } from '@/lib/feed-engine/engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Users, 
  Brain, 
  Heart, 
  MapPin, 
  Hash, 
  Star, 
  Download,
  CheckCircle,
  TrendingUp,
  Shield,
  Zap,
  Filter,
  Sparkles,
  Settings,
  Grid,
  List,
  X,
  Plus, // DODAJ OVU IKONU
  MoreVertical,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const feedEngine = new FeedEngine();

interface AlgorithmSelectorProps {
  userId?: string;
  onAlgorithmChange?: (algorithm: any) => void;
}

const categoryIcons = {
  chronological: Clock,
  social: Users,
  topical: Hash,
  'ai-optimized': Brain,
  wellbeing: Heart,
  local: MapPin,
};

export function AlgorithmSelector({ userId, onAlgorithmChange }: AlgorithmSelectorProps) {
  const router = useRouter();
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [userAlgorithms, setUserAlgorithms] = useState<any[]>([]);
  const [activeAlgorithm, setActiveAlgorithm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [availableAlgos, userAlgos, activeAlgo] = await Promise.all([
        feedEngine.getAvailableAlgorithms({ officialOnly: false }), // Promenjeno da prikazuje i custom algoritme
        userId ? getUserAlgorithms() : Promise.resolve([]),
        userId ? feedEngine.getUserAlgorithm(userId) : feedEngine.getUserAlgorithm(),
      ]);

      setAlgorithms(availableAlgos || []);
      setUserAlgorithms(userAlgos || []);
      setActiveAlgorithm(activeAlgo);

      // Extract unique categories
      const cats = new Set();
      availableAlgos?.forEach((algo: any) => {
        algo.categories?.forEach((cat: any) => {
          cats.add(JSON.stringify(cat.category));
        });
      });
      setCategories(Array.from(cats).map(c => JSON.parse(c as string)));
    } catch (error) {
      console.error('Error loading algorithms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAlgorithms = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_feed_algorithms')
      .select(`
        *,
        algorithms:feed_algorithms(*)
      `)
      .eq('user_id', userId);
    return data;
  };

  const handleInstall = async (algorithmId: string) => {
    if (!userId) {
      toast.error('Please sign in to install algorithms');
      return;
    }

    try {
      await feedEngine.installAlgorithm(userId, algorithmId);
      toast.success('Algorithm installed successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to install algorithm');
    }
  };

  const handleSetActive = async (algorithmId: string) => {
    if (!userId) {
      toast.error('Please sign in to change algorithms');
      return;
    }

    try {
      await feedEngine.setActiveAlgorithm(userId, algorithmId);
      const algorithm = algorithms.find(a => a.id === algorithmId);
      setActiveAlgorithm(algorithm);
      
      if (algorithm && onAlgorithmChange) {
        onAlgorithmChange(algorithm);
      }
      
      toast.success('Feed algorithm updated');
    } catch (error) {
      toast.error('Failed to update algorithm');
    }
  };

  const filteredAlgorithms = activeCategory === 'all' 
    ? algorithms
    : algorithms.filter(algo => 
        algo.categories?.some((cat: any) => cat.category.slug === activeCategory)
      );

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Feed Algorithms</CardTitle>
          <CardDescription className="text-sm">Loading algorithms...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Feed Algorithm</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Control what you see in your feed
            </CardDescription>
          </div>
          
          {/* DODAJ OVDE "Create New" dugme */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/algorithms/create')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New
            </Button>
            
            {activeAlgorithm && (
              <Badge variant="secondary" className="hidden sm:flex text-xs py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                {activeAlgorithm.name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 sm:px-6 pb-0">
        <Tabs defaultValue="browse" className="w-full">
          {/* Mobile Tabs with swipe indicators */}
          <div className="px-4 sm:px-0">
            <TabsList className="w-full grid grid-cols-3 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl">
              <TabsTrigger value="browse" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-800">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Browse</span>
                <span className="sm:hidden">All</span>
              </TabsTrigger>
              <TabsTrigger value="installed" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-800">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Installed</span>
                <span className="sm:hidden">My ({userAlgorithms.length})</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-800">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Active</span>
                <span className="sm:hidden">Active</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="pt-4">
            {/* Mobile Filter Header */}
            <div className="px-4 sm:px-0 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                    className="gap-2 rounded-full"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Filter</span>
                    {activeCategory !== 'all' && (
                      <Badge variant="secondary" className="h-4 px-1 text-xs">
                        {categories.find(c => c.slug === activeCategory)?.name}
                      </Badge>
                    )}
                  </Button>
                  
                  <div className="hidden sm:flex items-center gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {filteredAlgorithms.length} algorithms
                </div>
              </div>
            </div>

            {/* Mobile Category Filter Overlay */}
            {showCategoryFilter && (
              <div className="fixed inset-0 bg-black/50 z-50 sm:hidden" onClick={() => setShowCategoryFilter(false)}>
                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-4 animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Filter by Category</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowCategoryFilter(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pb-4">
                    <Button
                      variant={activeCategory === 'all' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveCategory('all');
                        setShowCategoryFilter(false);
                      }}
                    >
                      All Categories
                    </Button>
                    {categories.map((category) => {
                      const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Hash;
                      return (
                        <Button
                          key={category.id}
                          variant={activeCategory === category.slug ? 'default' : 'outline'}
                          className="w-full justify-start gap-3"
                          onClick={() => {
                            setActiveCategory(category.slug);
                            setShowCategoryFilter(false);
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {category.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Category Filter - Desktop */}
            <div className="hidden sm:block mb-6 px-4 sm:px-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('all')}
                  className="rounded-full"
                >
                  All Categories
                </Button>
                {categories.map((category) => {
                  const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Hash;
                  return (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.slug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory(category.slug)}
                      className="gap-2 rounded-full"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {category.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Algorithm Grid/List */}
            <div className={cn(
              "px-4 sm:px-0 pb-4",
              viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'space-y-3 sm:space-y-4'
            )}>
              {filteredAlgorithms.map((algorithm) => {
                const isInstalled = userAlgorithms.some(ua => ua.algorithm_id === algorithm.id);
                const isActive = activeAlgorithm?.id === algorithm.id;
                const Icon = categoryIcons[algorithm.categories?.[0]?.category?.slug as keyof typeof categoryIcons] || Hash;
                const mainCategory = algorithm.categories?.[0]?.category;
                const isCustom = !algorithm.is_official;

                if (viewMode === 'list') {
                  // Mobile-optimized list view
                  return (
                    <Card key={algorithm.id} className={cn(
                      "border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                      isActive && "ring-2 ring-primary",
                      isCustom && "border-l-4 border-l-green-500"
                    )}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isCustom ? "bg-green-500/10" : "bg-primary/10"
                          )}>
                            <Icon className={cn(
                              "h-4 w-4 sm:h-5 sm:w-5",
                              isCustom ? "text-green-500" : "text-primary"
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm sm:text-base line-clamp-1">
                                    {algorithm.name}
                                  </h4>
                                  {isCustom && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 bg-green-500/20 text-green-700 dark:text-green-400 border-green-300">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs text-muted-foreground">
                                    By {algorithm.is_official ? 'Nexus' : algorithm.author?.display_name || 'Community'}
                                  </span>
                                  {algorithm.is_official && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">Official</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-medium">
                                  {algorithm.rating?.toFixed(1) || 'N/A'}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                              {algorithm.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {mainCategory && (
                                  <Badge variant="outline" className="text-xs py-0 px-2">
                                    {mainCategory.name}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {algorithm.install_count?.toLocaleString() || 0} installs
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isActive ? (
                                  <Badge className="text-xs py-1 px-2">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : isInstalled ? (
                                  <Button 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => handleSetActive(algorithm.id)}
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Activate
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => handleInstall(algorithm.id)}
                                    disabled={!userId}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Install
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Grid view (default for mobile)
                return (
                  <Card key={algorithm.id} className={cn(
                    "border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                    isActive && "ring-2 ring-primary",
                    isCustom && "border-l-4 border-l-green-500"
                  )}>
                    <CardHeader className="pb-2 p-3 sm:p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isCustom ? "bg-green-500/10" : "bg-primary/10"
                          )}>
                            <Icon className={cn(
                              "h-4 w-4",
                              isCustom ? "text-green-500" : "text-primary"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-semibold line-clamp-1">
                                {algorithm.name}
                              </CardTitle>
                              {isCustom && (
                                <Badge variant="outline" className="text-xs px-1 py-0 bg-green-500/20 text-green-700 dark:text-green-400 border-green-300">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              By {algorithm.is_official ? 'Nexus' : algorithm.author?.display_name || 'Community'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">
                            {algorithm.rating?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-3 px-3 sm:px-4">
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {algorithm.description}
                      </p>
                      
                      <div className="space-y-2 mb-3">
                        {mainCategory && (
                          <Badge variant="outline" className="text-xs">
                            {mainCategory.name}
                          </Badge>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(algorithm.signal_descriptions || {}).slice(0, 2).map(signal => (
                            <Badge key={signal} variant="outline" className="text-xs capitalize px-2 py-0.5">
                              {signal.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {Object.keys(algorithm.signal_descriptions || {}).length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{Object.keys(algorithm.signal_descriptions || {}).length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {algorithm.install_count?.toLocaleString() || 0} installs
                        </div>
                        <div className="text-xs text-muted-foreground">
                          v{algorithm.version}
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="px-3 sm:px-4 pb-3">
                      {isActive ? (
                        <Button size="sm" className="w-full text-xs" disabled>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Button>
                      ) : isInstalled ? (
                        <Button 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => handleSetActive(algorithm.id)}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => handleInstall(algorithm.id)}
                          disabled={!userId}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Install
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="installed" className="pt-4">
            <div className="px-4 sm:px-0 pb-4">
              {userAlgorithms.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No algorithms installed yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse algorithms to customize your feed
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userAlgorithms.map((userAlgo) => {
                    const isActive = activeAlgorithm?.id === userAlgo.algorithm_id;
                    const Icon = categoryIcons[userAlgo.algorithms?.categories?.[0]?.category?.slug as keyof typeof categoryIcons] || Brain;
                    const isCustom = !userAlgo.algorithms?.is_official;
                    
                    return (
                      <Card key={userAlgo.id} className={cn(
                        "border-0 shadow-sm",
                        isCustom && "border-l-4 border-l-green-500"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                isCustom ? "bg-green-500/10" : "bg-primary/10"
                              )}>
                                <Icon className={cn(
                                  "h-4 w-4",
                                  isCustom ? "text-green-500" : "text-primary"
                                )} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm truncate">
                                    {userAlgo.algorithms?.name || 'Unknown Algorithm'}
                                  </h4>
                                  {isActive && (
                                    <Badge className="text-xs py-0 px-1.5">
                                      Active
                                    </Badge>
                                  )}
                                  {isCustom && (
                                    <Badge variant="outline" className="text-xs py-0 px-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-300">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {userAlgo.algorithms?.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!isActive ? (
                                <Button
                                  size="sm"
                                  className="text-xs h-8"
                                  onClick={() => handleSetActive(userAlgo.algorithm_id)}
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  Activate
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs py-1">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active" className="pt-4">
            <div className="px-4 sm:px-0 pb-4">
              {activeAlgorithm ? (
                <Card className={cn(
                  "border-0 shadow-sm",
                  !activeAlgorithm.is_official && "border-l-4 border-l-green-500"
                )}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        !activeAlgorithm.is_official ? "bg-green-500/10" : "bg-primary/10"
                      )}>
                        <Brain className={cn(
                          "h-5 w-5",
                          !activeAlgorithm.is_official ? "text-green-500" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base sm:text-lg">
                            {activeAlgorithm.name}
                          </CardTitle>
                          {!activeAlgorithm.is_official && (
                            <Badge variant="outline" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 border-green-300">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          Currently controlling your feed
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">How it works:</h4>
                      <p className="text-sm text-muted-foreground">
                        {activeAlgorithm.description}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm sm:text-base">Signals used:</h4>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(activeAlgorithm.signal_descriptions || {}).length} signals
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(activeAlgorithm.signal_descriptions || {}).slice(0, 3).map(([signal, description]) => (
                          <div key={signal} className="flex items-start gap-2 text-xs sm:text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium capitalize truncate">
                                {signal.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-muted-foreground ml-1 truncate block">
                                {description as string}
                              </span>
                            </div>
                          </div>
                        ))}
                        {Object.keys(activeAlgorithm.signal_descriptions || {}).length > 3 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{Object.keys(activeAlgorithm.signal_descriptions || {}).length - 3} more signals
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">Weights:</h4>
                      <div className="space-y-2">
                        {Object.entries(activeAlgorithm.weight_config || {}).slice(0, 5).map(([signal, weight]) => (
                          <div key={signal} className="flex items-center gap-2">
                            <span className="text-xs capitalize w-24 truncate">
                              {signal.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(weight as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs w-8 text-right">
                              {((weight as number) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                        {Object.keys(activeAlgorithm.weight_config || {}).length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{Object.keys(activeAlgorithm.weight_config || {}).length - 5} more weights
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No active algorithm</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Install and activate an algorithm to control your feed
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}